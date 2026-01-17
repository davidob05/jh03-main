from rest_framework import permissions, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db import models
from datetime import date, timedelta
from django.conf import settings
from django.core.mail import EmailMessage
from timetabling_system.models import (
    Exam,
    ExamVenue,
    Invigilator,
    InvigilatorAssignment,
    InvigilatorAvailability,
    InvigilatorRestriction,
    Venue,
    StudentExam,
    Provisions,
    Notification,
    Announcement,
    SlotChoices,
    Diet,
)
from timetabling_system.services import ingest_upload_result
from timetabling_system.services.venue_matching import venue_supports_caps
from timetabling_system.services.upload_processor import (
    _allowed_venue_types,
    _needs_accessible_venue,
    _needs_computer,
    _needs_separate_room,
    _required_capabilities,
)
from timetabling_system.utils.excel_parser import parse_excel_file
from timetabling_system.utils.venue_ingest import upsert_venues
from .serializers import (
    ExamSerializer,
    ExamVenueSerializer,
    ExamVenueWriteSerializer,
    InvigilatorAssignmentSerializer,
    InvigilatorSerializer,
    VenueSerializer,
    VenueWriteSerializer,
    NotificationSerializer,
    AnnouncementSerializer,
    DietSerializer,
)


def log_notification(type_: str, message: str, when=None, user=None):
    try:
        Notification.objects.create(
            type=type_,
            message=message,
            timestamp=when or timezone.now(),
            triggered_by=user,
        )
    except Exception:
        # Do not break main flows if notification logging fails
        pass


def _get_request_user(view, serializer=None):
    request = getattr(view, "request", None)
    if request is None and serializer is not None:
        try:
            request = serializer.context.get("request")
        except Exception:
            request = None
    return getattr(request, "user", None) if request is not None else None


def _resolve_invigilator_for_user(user):
    """
    Attempt to resolve an Invigilator profile for a user using the same
    fallbacks as the InvigilatorAssignmentViewSet queryset.
    """
    if user is None:
        return None
    invigilator = getattr(user, "invigilator_profile", None)
    if invigilator:
        return invigilator
    return (
        Invigilator.objects.filter(user=user).first()
        or Invigilator.objects.filter(preferred_name__iexact=getattr(user, "first_name", "") or user.username).first()
        or Invigilator.objects.filter(full_name__icontains=getattr(user, "username", "")).first()
    )


def _has_time_conflict(candidate, assignments):
    """
    Return True if the candidate assignment overlaps with any of the supplied assignments.
    Only compares rows with valid start/end timestamps.
    """
    c_start = getattr(candidate, "assigned_start", None)
    c_end = getattr(candidate, "assigned_end", None)
    if not c_start or not c_end:
        return False

    for assignment in assignments:
        a_start = getattr(assignment, "assigned_start", None)
        a_end = getattr(assignment, "assigned_end", None)
        if not a_start or not a_end:
            continue
        if c_start < a_end and a_start < c_end:
            return True
    return False


class IsInvigilatorOrAdmin(permissions.BasePermission):
    """
    Allow access to admins or users that can be resolved to an invigilator.
    """

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if user and (user.is_staff or user.is_superuser):
            return True
        return _resolve_invigilator_for_user(user) is not None


class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all().prefetch_related("examvenue_set__venue")
    serializer_class = ExamSerializer
    permission_classes = [permissions.IsAdminUser]
    throttle_classes: list = []  # Admin-only; allow large bulk operations without throttling

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        """
        Delete multiple Exam records (admin-only).
        Expects JSON body: {"ids": [1,2,3]}
        """
        ids = request.data.get("ids") if isinstance(request.data, dict) else None
        if not ids or not isinstance(ids, list):
            return Response(
                {"detail": "Provide a non-empty list of ids."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ids = [pk for pk in ids if isinstance(pk, int)]
        if not ids:
            return Response(
                {"detail": "No valid exam ids supplied."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = Exam.objects.filter(pk__in=ids)
        deleted_count, _ = qs.delete()
        return Response({"deleted": deleted_count}, status=status.HTTP_200_OK)

    def perform_update(self, serializer):
        instance = serializer.save()
        log_notification("examChange", f"Exam '{instance.exam_name}' was updated.", user=_get_request_user(self, serializer))
        return instance


class VenueViewSet(viewsets.ModelViewSet):
    queryset = Venue.objects.all().prefetch_related("examvenue_set__exam")
    serializer_class = VenueSerializer
    permission_classes = [permissions.IsAdminUser]
    throttle_classes: list = []  # Admin-only; allow large bulk operations without throttling

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        """
        Delete multiple Venue records (admin-only).
        Expects JSON body: {"ids": ["Hall A", "Lab B"]}
        """
        ids = request.data.get("ids") if isinstance(request.data, dict) else None
        if not ids or not isinstance(ids, list):
            return Response(
                {"detail": "Provide a non-empty list of venue names in 'ids'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ids = [pk for pk in ids if isinstance(pk, str) and pk.strip()]
        if not ids:
            return Response(
                {"detail": "No valid venue names supplied."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = Venue.objects.filter(venue_name__in=ids)
        deleted_count, _ = qs.delete()
        return Response({"deleted": deleted_count}, status=status.HTTP_200_OK)

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return VenueWriteSerializer
        return VenueSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        log_notification("venueChange", f"Venue '{instance.venue_name}' was created.", user=_get_request_user(self, serializer))
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        log_notification("venueChange", f"Venue '{instance.venue_name}' was updated.", user=_get_request_user(self, serializer))
        return instance

    def perform_destroy(self, instance):
        venue_name = instance.venue_name
        response = super().perform_destroy(instance)
        log_notification("venueChange", f"Venue '{venue_name}' was deleted.", user=_get_request_user(self))
        return response


class ExamVenueViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for ExamVenue rows.
    - Core venues are read-only and cannot be updated or deleted here.
    - Creation requires an existing Exam and an optional existing Venue name.
    """

    queryset = ExamVenue.objects.select_related("exam", "venue").all()
    permission_classes = [permissions.IsAdminUser]
    throttle_classes: list = []  # Admin-only; allow large bulk operations without throttling

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ExamVenueWriteSerializer
        return ExamVenueSerializer

    def perform_destroy(self, instance):
        if instance.core:
            raise ValidationError("Core exam venues cannot be deleted.")
        log_notification(
            "examChange",
            f"Exam venue removed for '{instance.exam.exam_name if instance.exam else 'Exam'}'.",
        )
        return super().perform_destroy(instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        exam_name = instance.exam.exam_name if instance.exam else "Exam"
        venue_name = instance.venue.venue_name if instance.venue else "Unassigned"
        log_notification("examChange", f"Exam '{exam_name}' venue updated to {venue_name}.", user=_get_request_user(self, serializer))
        return instance

    def perform_create(self, serializer):
        instance = serializer.save()
        exam_name = instance.exam.exam_name if instance.exam else "Exam"
        venue_name = instance.venue.venue_name if instance.venue else "Unassigned"
        log_notification("examChange", f"Exam '{exam_name}' venue set to {venue_name}.", user=_get_request_user(self, serializer))
        return instance


class InvigilatorViewSet(viewsets.ModelViewSet):
    queryset = Invigilator.objects.select_related("user").prefetch_related(
        "assignments__exam_venue__exam",
        "assignments__exam_venue__venue",
        "availabilities",
    )
    serializer_class = InvigilatorSerializer
    permission_classes = [permissions.IsAdminUser]
    throttle_classes: list = []  # Admin-only; allow large bulk operations without throttling

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        """
        Delete multiple invigilators (admin-only).
        Expects JSON body: {"ids": [1,2,3]}
        """
        ids = request.data.get("ids") if isinstance(request.data, dict) else None
        if not ids or not isinstance(ids, list):
            return Response(
                {"detail": "Provide a non-empty list of ids."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ids = [pk for pk in ids if isinstance(pk, int)]
        if not ids:
            return Response(
                {"detail": "No valid invigilator ids supplied."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = Invigilator.objects.filter(pk__in=ids)
        deleted_count, _ = qs.delete()
        return Response({"deleted": deleted_count}, status=status.HTTP_200_OK)

    def perform_update(self, serializer):
        instance = serializer.save()
        name = instance.preferred_name or instance.full_name or "Invigilator"
        log_notification("invigilatorUpdate", f"{name} has updated details.", user=_get_request_user(self, serializer))
        return instance


class InvigilatorAssignmentViewSet(viewsets.ModelViewSet):
    """
    Admins can manage all assignments; invigilators can read their own.
    """

    serializer_class = InvigilatorAssignmentSerializer
    throttle_classes: list = []

    def get_permissions(self):
        if getattr(self, "action", None) in {"available_covers", "pickup"}:
            return [IsInvigilatorOrAdmin()]
        if self.request.method in permissions.SAFE_METHODS:
            return [IsInvigilatorOrAdmin()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = InvigilatorAssignment.objects.select_related(
            "invigilator",
            "exam_venue__exam",
            "exam_venue__venue",
        )
        user = getattr(self.request, "user", None)
        if user and (user.is_staff or user.is_superuser):
            return qs.all()
        invigilator = _resolve_invigilator_for_user(user)
        if invigilator is None:
            return qs.none()
        return qs.filter(invigilator=invigilator)

    @action(detail=False, methods=["get"], url_path="available-covers", permission_classes=[IsInvigilatorOrAdmin])
    def available_covers(self, request):
        """
        Return cancelled shifts that do not clash with the requesting invigilator
        and have not already been covered.
        """
        invigilator = _resolve_invigilator_for_user(getattr(request, "user", None))
        if invigilator is None:
            return Response({"detail": "Invigilator profile not found."}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        base_qs = (
            InvigilatorAssignment.objects.select_related("exam_venue__exam", "exam_venue__venue", "invigilator")
            .filter(cancel=True, assigned_end__gte=now)
            .annotate(has_cover=models.Exists(
                InvigilatorAssignment.objects.filter(cover_for=models.OuterRef("pk"), cancel=False)
            ))
            .filter(has_cover=False)
        )

        current_assignments = list(
            InvigilatorAssignment.objects.select_related("exam_venue__exam", "exam_venue__venue")
            .filter(invigilator=invigilator, cancel=False)
        )

        available = [
            a
            for a in base_qs
            if not _has_time_conflict(a, current_assignments)
            and not any(ca.exam_venue_id == a.exam_venue_id for ca in current_assignments)
        ]
        serializer = self.get_serializer(available, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="pickup", permission_classes=[IsInvigilatorOrAdmin])
    def pickup(self, request, pk=None):
        """
        Allow an invigilator to pick up a cancelled shift if no conflicts exist.
        Creates a new assignment marked as a cover.
        """
        invigilator = _resolve_invigilator_for_user(getattr(request, "user", None))
        if invigilator is None:
            return Response({"detail": "Invigilator profile not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            candidate = InvigilatorAssignment.objects.select_related(
                "exam_venue__exam", "exam_venue__venue", "invigilator"
            ).get(pk=pk, cancel=True)
        except InvigilatorAssignment.DoesNotExist:
            return Response({"detail": "Cancelled shift not found."}, status=status.HTTP_404_NOT_FOUND)

        if candidate.cover_assignments.filter(cancel=False).exists():
            return Response({"detail": "Shift already covered."}, status=status.HTTP_400_BAD_REQUEST)

        if InvigilatorAssignment.objects.filter(invigilator=invigilator, exam_venue=candidate.exam_venue).exists():
            return Response({"detail": "You already have an assignment for this exam slot."}, status=status.HTTP_400_BAD_REQUEST)

        current_assignments = InvigilatorAssignment.objects.filter(invigilator=invigilator, cancel=False)
        if _has_time_conflict(candidate, current_assignments):
            return Response({"detail": "You already have a conflicting shift."}, status=status.HTTP_400_BAD_REQUEST)

        new_assignment = InvigilatorAssignment.objects.create(
            invigilator=invigilator,
            exam_venue=candidate.exam_venue,
            role=candidate.role,
            assigned_start=candidate.assigned_start,
            assigned_end=candidate.assigned_end,
            break_time_minutes=candidate.break_time_minutes,
            confirmed=False,
            cancel=False,
            cover=True,
            cover_for=candidate,
            notes=candidate.notes,
        )

        name = invigilator.preferred_name or invigilator.full_name or "Invigilator"
        exam_name = candidate.exam_venue.exam.exam_name if candidate.exam_venue and candidate.exam_venue.exam else "an exam"
        log_notification("shiftPickup", f"{name} picked up a shift for {exam_name}.", user=request.user)

        serializer = self.get_serializer(new_assignment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        instance = serializer.save()
        name = instance.invigilator.preferred_name or instance.invigilator.full_name or "Invigilator"
        exam_name = instance.exam_venue.exam.exam_name if instance.exam_venue and instance.exam_venue.exam else "an exam"
        log_notification("shiftPickup", f"{name} picked up a shift for {exam_name}.", user=_get_request_user(self, serializer))
        return instance

    def perform_destroy(self, instance):
        name = instance.invigilator.preferred_name or instance.invigilator.full_name or "Invigilator"
        exam_name = instance.exam_venue.exam.exam_name if instance.exam_venue and instance.exam_venue.exam else "an exam"
        log_notification("cancellation", f"{name} cancelled a shift for {exam_name}.", user=_get_request_user(self))
        return super().perform_destroy(instance)


class TimetableUploadView(APIView):
    """Accepts an uploaded Excel file and routes it through the parser helpers."""
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAdminUser]
    throttle_classes: list = []  # Admin-only; allow large bulk uploads without throttling


    def post(self, request, *args, **kwargs):
        
        upload = request.FILES.get("file")
        if not upload:
            return Response(
                {"status": "error", "message": "No file uploaded."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if hasattr(upload, "seek"):
            upload.seek(0)
                    
        try:
            result = parse_excel_file(upload)
        except Exception as exc:  # pragma: no cover - defensive fallback
            return Response(
                {
                    "status": "error",
                    "message": "Failed to parse uploaded file.",
                    "details": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if result.get("status") == "ok":
            ingest_summary = ingest_upload_result(
                result,
                file_name=getattr(upload, "name", "uploaded_file"),
                uploaded_by=request.user,
            )
            if ingest_summary:
                result["ingest"] = ingest_summary
                result["records_created"] = ingest_summary.get("created", 0)
                result["records_updated"] = ingest_summary.get("updated", 0)

        http_status = (
            status.HTTP_200_OK if result.get("status") == "ok" else status.HTTP_400_BAD_REQUEST
        )
        return Response(result, status=http_status)


class NotificationsView(APIView):
    """
    Return notifications stored in the Notification table.
    """
    permission_classes = [permissions.IsAdminUser]
    throttle_classes: list = []  # Admin-only; allow large pulls without throttling

    def get(self, request, *args, **kwargs):
        cutoff = timezone.now() - timedelta(days=7)
        qs = Notification.objects.filter(timestamp__gte=cutoff).order_by("-timestamp")[:50]
        return Response(NotificationSerializer(qs, many=True).data)

    def post(self, request, *args, **kwargs):
        payload = request.data or {}
        invigilator_ids = payload.get("invigilator_ids") or []
        methods = payload.get("methods") or []
        subject = (payload.get("subject") or "").strip()
        message = (payload.get("message") or "").strip()
        log_only = bool(payload.get("log_only"))

        if not isinstance(invigilator_ids, (list, tuple)):
            return Response({"detail": "invigilator_ids must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invigilator_ids = [int(i) for i in invigilator_ids]
        except (TypeError, ValueError):
            return Response({"detail": "invigilator_ids must contain numeric IDs."}, status=status.HTTP_400_BAD_REQUEST)

        if not invigilator_ids:
            return Response({"detail": "At least one invigilator ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        if not message and not log_only:
            return Response({"detail": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(methods, (list, tuple)):
            methods = []
        allowed_methods = {"email", "sms"}
        invalid_methods = [m for m in methods if m not in allowed_methods]
        if invalid_methods:
            return Response(
                {"detail": f"Invalid methods: {', '.join(invalid_methods)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not methods:
            return Response({"detail": "Choose at least one delivery method (email or sms)."}, status=status.HTTP_400_BAD_REQUEST)

        recipients = list(Invigilator.objects.filter(id__in=invigilator_ids))
        if not recipients:
            return Response({"detail": "No matching invigilators found."}, status=status.HTTP_404_NOT_FOUND)

        subject_to_use = subject or "Message from administrator"

        if log_only:
            count = len(recipients)
            Notification.objects.create(
                type=Notification.NotificationType.MAIL_MERGE,
                message=f"Sent '{subject_to_use}' mail merge to {count} invigilator{'s' if count != 1 else ''}",
                timestamp=timezone.now(),
                triggered_by=request.user,
            )
            return Response(
                {
                    "status": "ok",
                    "logged": True,
                    "invigilator_ids": [i.id for i in recipients],
                    "count": count,
                    "subject": subject_to_use,
                }
            )

        if settings.EMAIL_BACKEND in {
            "django.core.mail.backends.console.EmailBackend",
            "django.core.mail.backends.dummy.EmailBackend",
        }:
            return Response(
                {
                    "detail": "Email backend is set to console/dummy. Configure SMTP via EMAIL_* env vars to send messages.",
                    "backend": settings.EMAIL_BACKEND,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        from django.core.mail import send_mail

        sender_email = settings.DEFAULT_FROM_EMAIL
        reply_to_email = getattr(request.user, "email", "") or None

        email_recipients = []
        sms_recipients = []
        skipped_sms = []

        for invigilator in recipients:
            name = invigilator.preferred_name or invigilator.full_name or f"Invigilator #{invigilator.id}"
            if "email" in methods:
                email_recipients.extend(
                    [
                        e
                        for e in [
                            getattr(invigilator, "university_email", None),
                            getattr(invigilator, "personal_email", None),
                        ]
                        if e
                    ]
                )
            if "sms" in methods:
                sms_candidate = getattr(invigilator, "janet_txt", None) or getattr(invigilator, "mobile_text_only", None)
                if sms_candidate and "@" in sms_candidate:
                    sms_recipients.append(sms_candidate)
                else:
                    skipped_sms.append(name)

        send_results = {"email": 0, "sms": 0}
        errors = []

        if "email" in methods and email_recipients:
            try:
                email_msg = EmailMessage(
                    subject=subject_to_use,
                    body=message,
                    from_email=sender_email,
                    to=email_recipients,
                    reply_to=[reply_to_email] if reply_to_email else None,
                )
                email_msg.send(fail_silently=False)
                send_results["email"] = len(email_recipients)
            except Exception as exc:
                errors.append(f"Email send failed: {exc}")

        if "sms" in methods and sms_recipients:
            try:
                sms_msg = EmailMessage(
                    subject=subject_to_use,
                    body=message,
                    from_email=sender_email,
                    to=sms_recipients,
                    reply_to=[reply_to_email] if reply_to_email else None,
                )
                sms_msg.send(fail_silently=False)
                send_results["sms"] = len(sms_recipients)
            except Exception as exc:
                errors.append(f"SMS send failed: {exc}")

        if "email" in methods and not email_recipients:
            errors.append("No email addresses found for selected invigilators.")
        if "sms" in methods and not sms_recipients:
            errors.append(
                "No SMS-capable addresses (e.g. janet_txt/mobile_text_only with @) found for selected invigilators."
            )
        if skipped_sms and "sms" in methods:
            errors.append(f"Skipped SMS for: {', '.join(skipped_sms)} (missing SMS address).")

        if errors and send_results["email"] == 0 and send_results["sms"] == 0:
            return Response({"detail": errors[0]}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "status": "ok",
                "sent_email": send_results["email"],
                "sent_sms": send_results["sms"],
                "invigilator_ids": [i.id for i in recipients],
                "methods": list(methods),
                "subject": subject_to_use,
                "message": message,
                "warnings": errors,
            },
            status=status.HTTP_200_OK,
        )


class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    CRUD for announcements shown on dashboards.
    Admin-only for mutations; authenticated invigilators/admins can read.
    """

    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    throttle_classes: list = []

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [IsInvigilatorOrAdmin()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()

        audience = self.request.query_params.get("audience")
        if audience:
            qs = qs.filter(audience=audience)

        active_flag = self.request.query_params.get("active")
        if active_flag is not None:
            should_be_active = str(active_flag).lower() in {"1", "true", "yes"}
            if should_be_active:
                now = timezone.now()
                qs = qs.filter(is_active=True).filter(
                    models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now)
                )
            else:
                qs = qs.filter(is_active=False)

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=_get_request_user(self, serializer))


class DietViewSet(viewsets.ModelViewSet):
    queryset = Diet.objects.all().order_by("-is_active", "-start_date", "code")
    serializer_class = DietSerializer
    permission_classes = [permissions.IsAdminUser]
    throttle_classes: list = []


class StudentProvisionListView(APIView):
    """
    Return provision records for students, optionally filtered to those
    whose allocated venue does not yet meet their needs.
    """

    permission_classes = [permissions.IsAdminUser]
    throttle_classes: list = []  # Admin-only

    def get(self, request, *args, **kwargs):
        unallocated_only = str(request.query_params.get("unallocated") or "").lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        provisions = Provisions.objects.select_related("student", "exam").all()
        student_exam_map = {
            (se.student_id, se.exam_id): se
            for se in StudentExam.objects.select_related("exam_venue__venue", "student", "exam")
        }

        rows = []
        for provision in provisions:
            student_exam = student_exam_map.get((provision.student_id, provision.exam_id))
            exam_venue = getattr(student_exam, "exam_venue", None)
            venue = getattr(exam_venue, "venue", None)

            required_caps = _required_capabilities(provision.provisions)
            needs_accessible = _needs_accessible_venue(provision.provisions)
            needs_separate_room = _needs_separate_room(provision.provisions)
            needs_computer = _needs_computer(provision.provisions)
            allowed_types = _allowed_venue_types(needs_computer, needs_separate_room)

            matches_needs = False
            allocation_issue = None

            if not exam_venue:
                allocation_issue = "No exam venue assigned"
            elif not venue:
                allocation_issue = "No physical venue allocated"
            else:
                if allowed_types is not None and venue.venuetype not in allowed_types:
                    allocation_issue = "Venue type does not satisfy requirements"
                elif needs_accessible and not venue.is_accessible:
                    allocation_issue = "Venue is not marked accessible"
                elif required_caps and not venue_supports_caps(venue, required_caps):
                    allocation_issue = "Venue is missing required provisions"
                else:
                    matches_needs = True

            if unallocated_only and matches_needs:
                continue

            rows.append(
                {
                    "student_id": provision.student.student_id,
                    "student_name": provision.student.student_name,
                    "exam_id": provision.exam.exam_id,
                    "exam_name": provision.exam.exam_name,
                    "course_code": provision.exam.course_code,
                    "provisions": provision.provisions,
                    "notes": provision.notes,
                    "exam_venue_id": exam_venue.pk if exam_venue else None,
                    "exam_venue_caps": getattr(exam_venue, "provision_capabilities", []) or [],
                    "venue_name": venue.venue_name if venue else None,
                    "venue_type": venue.venuetype if venue else None,
                    "venue_accessible": venue.is_accessible if venue else None,
                    "required_capabilities": required_caps,
                    "allowed_venue_types": sorted(list(allowed_types)) if allowed_types else [],
                    "matches_needs": matches_needs,
                    "allocation_issue": allocation_issue,
                    "student_exam_id": student_exam.pk if student_exam else None,
                }
            )

        rows.sort(key=lambda r: (r.get("student_name") or "", r.get("course_code") or ""))
        return Response(rows)


class InvigilatorNotificationsView(APIView):
    """
    Return recent notifications (last 20) for authenticated invigilators.
    Currently returns global notifications as the model is not scoped per-invigilator.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes: list = []  # Lightweight

    def get(self, request, *args, **kwargs):
        qs = Notification.objects.order_by("-timestamp")[:20]
        return Response(NotificationSerializer(qs, many=True).data)


class InvigilatorAvailabilityView(APIView):
    """
    Allow invigilators to view and update availability (restrictions) for a given diet.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes: list = []

    def _get_invigilator(self, request):
        invigilator = getattr(request.user, "invigilator_profile", None)
        if invigilator is None:
            invigilator = _resolve_invigilator_for_user(getattr(request, "user", None))
        return invigilator

    def _validate_diet(self, diet_code: str | None) -> Diet:
        if not diet_code:
            raise ValidationError({"diet": "Diet is required."})
        diet = Diet.objects.filter(code=diet_code).first()
        if not diet:
            raise ValidationError({"diet": f"Unknown diet '{diet_code}'."})
        return diet

    def _ensure_availability_rows(self, invigilator, diet_code: str, start_date: date | None, end_date: date | None):
        if start_date is None or end_date is None:
            return
        current_date = start_date
        to_create = []
        while current_date <= end_date:
            for slot in SlotChoices.values:
                to_create.append(
                    InvigilatorAvailability(
                        invigilator=invigilator,
                        date=current_date,
                        slot=slot,
                        available=True,
                    )
                )
            current_date += timedelta(days=1)
        InvigilatorAvailability.objects.bulk_create(to_create, ignore_conflicts=True)

    def _serialize_days(self, qs, start_date: date | None, end_date: date | None):
        entries = list(qs)
        by_date = {}
        for item in entries:
            key = item.date.isoformat()
            by_date.setdefault(key, {})[item.slot] = bool(item.available)

        # If we don't have a known range, infer one from the data
        inferred_start = inferred_end = None
        if entries:
            inferred_start = min(e.date for e in entries)
            inferred_end = max(e.date for e in entries)
        start = start_date or inferred_start
        end = end_date or inferred_end

        days = []
        if start and end:
            current_date = start
            while current_date <= end:
                key = current_date.isoformat()
                slots_map = by_date.get(key, {})
                slots = [
                    {"slot": slot, "available": slots_map.get(slot, True)}
                    for slot in SlotChoices.values
                ]
                days.append({"date": key, "slots": slots})
                current_date += timedelta(days=1)
        else:
            for key, slots_map in sorted(by_date.items()):
                slots = [
                    {"slot": slot, "available": slots_map.get(slot, True)}
                    for slot in SlotChoices.values
                ]
                days.append({"date": key, "slots": slots})
        return days

    def _serialize_entries(self, qs):
        return [
            {
                "date": item.date.isoformat(),
                "slot": item.slot,
                "available": bool(item.available),
            }
            for item in qs
        ]

    def get(self, request, *args, **kwargs):
        invigilator = self._get_invigilator(request)
        if invigilator is None:
            return Response({"detail": "Invigilator profile not found."}, status=status.HTTP_404_NOT_FOUND)

        restriction_diets = list(
            InvigilatorRestriction.objects.filter(invigilator=invigilator).values_list("diet", flat=True)
        )
        diet_qs = list(Diet.objects.all().order_by("-is_active", "-start_date", "code"))
        if not diet_qs:
            return Response({"detail": "No diets are configured."}, status=status.HTTP_400_BAD_REQUEST)

        available_diets = [
            {
                "code": d.code,
                "name": d.name,
                "start_date": str(d.start_date) if d.start_date else None,
                "end_date": str(d.end_date) if d.end_date else None,
                "restriction_cutoff": str(d.restriction_cutoff) if d.restriction_cutoff else None,
            }
            for d in diet_qs
        ]

        requested_diet_code = request.query_params.get("diet")
        diet_obj = None
        if requested_diet_code:
            diet_obj = self._validate_diet(requested_diet_code)
        else:
            diet_obj = next((d for d in diet_qs if d.is_active), diet_qs[0] if diet_qs else None)

        if diet_obj is None:
            return Response({"detail": "No diets are configured."}, status=status.HTTP_400_BAD_REQUEST)

        diet = diet_obj.code
        start_date = diet_obj.start_date
        end_date = diet_obj.end_date

        self._ensure_availability_rows(invigilator, diet, start_date, end_date)

        qs = InvigilatorAvailability.objects.filter(invigilator=invigilator)
        if start_date and end_date:
            qs = qs.filter(date__range=(start_date, end_date))
        qs = qs.order_by("date", "slot")

        entries = list(qs)

        return Response(
            {
                "diet": diet,
                "diet_name": diet_obj.name,
                "restriction_cutoff": str(diet_obj.restriction_cutoff) if diet_obj.restriction_cutoff else None,
                "start_date": str(start_date) if start_date else None,
                "end_date": str(end_date) if end_date else None,
                "diets": available_diets,
                "days": self._serialize_days(entries, start_date, end_date),
                "availabilities": self._serialize_entries(entries),
            }
        )

    def put(self, request, *args, **kwargs):
        invigilator = self._get_invigilator(request)
        if invigilator is None:
            return Response({"detail": "Invigilator profile not found."}, status=status.HTTP_404_NOT_FOUND)

        payload = request.data or {}
        diet_obj = self._validate_diet(payload.get("diet"))
        diet = diet_obj.code
        unavailable = payload.get("unavailable") or []

        cutoff_date = diet_obj.restriction_cutoff
        today = timezone.localdate()
        if cutoff_date and today >= cutoff_date:
            return Response(
                {
                    "detail": f"Restrictions for {diet_obj.name or diet} closed on {cutoff_date}. Please contact admin to request changes."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        start_date = diet_obj.start_date
        end_date = diet_obj.end_date

        self._ensure_availability_rows(invigilator, diet, start_date, end_date)

        # Normalize and validate unavailable slots
        unavailable_set = set()
        for entry in unavailable:
            try:
                date_str = (entry.get("date") or "").strip()
                slot = (entry.get("slot") or "").strip()
            except AttributeError:
                continue
            if slot not in SlotChoices.values:
                continue
            try:
                parsed_date = date.fromisoformat(date_str)
            except Exception:
                continue
            if start_date and end_date and (parsed_date < start_date or parsed_date > end_date):
                continue
            unavailable_set.add((parsed_date, slot))

        qs_base = InvigilatorAvailability.objects.filter(invigilator=invigilator)
        if start_date and end_date:
            qs_base = qs_base.filter(date__range=(start_date, end_date))
        qs = list(qs_base)

        # Reset all to available, then apply restrictions
        to_update = []
        for item in qs:
            item.available = True
        for item in qs:
            if (item.date, item.slot) in unavailable_set:
                item.available = False
            to_update.append(item)
        InvigilatorAvailability.objects.bulk_update(to_update, ["available"])

        # Prepare notification
        inv_name = invigilator.preferred_name or invigilator.full_name or "Invigilator"
        diet_label = diet_obj.name or diet
        count_unavailable = len(unavailable_set)

        def _format_slot(slot: str) -> str:
            return slot.replace("_", " ").title()

        slot_order = {slot: idx for idx, slot in enumerate(SlotChoices.values)}

        def _summarize_unavailable() -> str:
            by_date: dict[date, list[str]] = {}
            for unavailable_date, slot in unavailable_set:
                by_date.setdefault(unavailable_date, []).append(slot)

            parts: list[str] = []
            for unavailable_date in sorted(by_date.keys())[:3]:
                slots_for_day = sorted(by_date[unavailable_date], key=lambda s: slot_order.get(s, len(slot_order)))
                slot_labels = ", ".join(_format_slot(slot) for slot in slots_for_day)
                parts.append(f"{unavailable_date.strftime('%b %d')}: {slot_labels}")

            remaining_days = len(by_date) - len(parts)
            if remaining_days > 0:
                parts.append(f"+{remaining_days} more day{'s' if remaining_days != 1 else ''}")

            return "; ".join(parts)

        if count_unavailable:
            slot_word = "slot" if count_unavailable == 1 else "slots"
            summary = _summarize_unavailable()
            if summary:
                message = f"{inv_name} updated availability for {diet_label}: unavailable on {summary} ({count_unavailable} {slot_word})"
            else:
                message = f"{inv_name} updated availability for {diet_label}: {count_unavailable} {slot_word} unavailable"
        else:
            message = f"{inv_name} set availability for {diet_label}: all slots available"
        log_notification(Notification.NotificationType.AVAILABILITY, message, user=request.user)

        refreshed_qs = InvigilatorAvailability.objects.filter(invigilator=invigilator)
        if start_date and end_date:
            refreshed_qs = refreshed_qs.filter(date__range=(start_date, end_date))
        refreshed_qs = refreshed_qs.order_by("date", "slot")

        refreshed = list(refreshed_qs)

        return Response(
            {
                "status": "ok",
                "diet": diet,
                "unavailable_count": count_unavailable,
                "start_date": str(start_date) if start_date else None,
                "end_date": str(end_date) if end_date else None,
                "days": self._serialize_days(refreshed, start_date, end_date),
                "availabilities": self._serialize_entries(refreshed),
            },
            status=status.HTTP_200_OK,
        )


class InvigilatorStatsView(APIView):
    """
    Returns stats for the currently authenticated invigilator.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes: list = []  # Lightweight endpoint

    def get(self, request, *args, **kwargs):
        user = request.user
        invigilator = getattr(user, "invigilator_profile", None) or _resolve_invigilator_for_user(user)
        if invigilator is None:
            return Response({"detail": "Invigilator profile not found."}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        assignments = InvigilatorAssignment.objects.select_related("exam_venue__exam", "exam_venue__venue").filter(
            invigilator=invigilator
        )
        now_ts = timezone.now()
        upcoming_qs = assignments.filter(cancel=False, assigned_start__gte=now_ts).order_by("assigned_start")
        cancelled_qs = assignments.filter(cancel=True)

        next_assignment = upcoming_qs.first()

        def _duration_hours(qs):
            total = 0.0
            for a in qs:
                try:
                    total += float(a.total_hours())
                except Exception:
                    continue
            return round(total, 2)

        data = {
            "total_shifts": assignments.count(),
            "upcoming_shifts": upcoming_qs.count(),
            "cancelled_shifts": cancelled_qs.count(),
            "hours_assigned": _duration_hours(assignments),
            "hours_upcoming": _duration_hours(upcoming_qs),
            "restrictions": InvigilatorRestriction.objects.filter(invigilator=invigilator).count(),
            "availability_entries": InvigilatorAvailability.objects.filter(invigilator=invigilator).count(),
            "next_assignment": None,
        }
        if next_assignment:
            data["next_assignment"] = {
                "exam_name": getattr(next_assignment.exam_venue.exam, "exam_name", None) if next_assignment.exam_venue else None,
                "venue_name": getattr(next_assignment.exam_venue.venue, "venue_name", None) if next_assignment.exam_venue else None,
                "start": next_assignment.assigned_start,
                "end": next_assignment.assigned_end,
                "role": next_assignment.role,
            }
        return Response(data, status=status.HTTP_200_OK)


class InvigilatorAssignmentsView(APIView):
    """
    Return assignments for the authenticated invigilator.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes: list = []

    def get(self, request, *args, **kwargs):
        invigilator = getattr(request.user, "invigilator_profile", None)
        if invigilator is None:
            return Response({"detail": "Invigilator profile not found."}, status=status.HTTP_404_NOT_FOUND)

        assignments = (
            InvigilatorAssignment.objects.select_related("exam_venue__exam", "exam_venue__venue")
            .filter(invigilator=invigilator)
            .order_by("assigned_start")
        )

        return Response(InvigilatorAssignmentSerializer(assignments, many=True).data)
