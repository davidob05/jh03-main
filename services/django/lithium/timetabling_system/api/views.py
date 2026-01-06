from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.core.mail import EmailMessage
from timetabling_system.models import (
    Exam,
    ExamVenue,
    Invigilator,
    InvigilatorAssignment,
    Venue,
    Notification,
)
from timetabling_system.services import ingest_upload_result
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
        log_notification("examChange", f"Exam '{instance.exam_name}' was updated.", user=self.request.user)
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
        log_notification("venueChange", f"Venue '{instance.venue_name}' was created.", user=self.request.user)
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        log_notification("venueChange", f"Venue '{instance.venue_name}' was updated.", user=self.request.user)
        return instance

    def perform_destroy(self, instance):
        venue_name = instance.venue_name
        response = super().perform_destroy(instance)
        log_notification("venueChange", f"Venue '{venue_name}' was deleted.", user=self.request.user)
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
        log_notification("examChange", f"Exam '{exam_name}' venue updated to {venue_name}.", user=self.request.user)
        return instance

    def perform_create(self, serializer):
        instance = serializer.save()
        exam_name = instance.exam.exam_name if instance.exam else "Exam"
        venue_name = instance.venue.venue_name if instance.venue else "Unassigned"
        log_notification("examChange", f"Exam '{exam_name}' venue set to {venue_name}.", user=self.request.user)
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
        log_notification("invigilatorUpdate", f"{name} has updated details.", user=self.request.user)
        return instance


class InvigilatorAssignmentViewSet(viewsets.ModelViewSet):
    queryset = InvigilatorAssignment.objects.select_related(
        "invigilator",
        "exam_venue__exam",
        "exam_venue__venue",
    ).all()
    serializer_class = InvigilatorAssignmentSerializer
    permission_classes = [permissions.IsAdminUser]
    throttle_classes: list = []  # Admin-only; allow large bulk operations without throttling

    def perform_create(self, serializer):
        instance = serializer.save()
        name = instance.invigilator.preferred_name or instance.invigilator.full_name or "Invigilator"
        exam_name = instance.exam_venue.exam.exam_name if instance.exam_venue and instance.exam_venue.exam else "an exam"
        log_notification("shiftPickup", f"{name} picked up a shift for {exam_name}.", user=self.request.user)
        return instance

    def perform_destroy(self, instance):
        name = instance.invigilator.preferred_name or instance.invigilator.full_name or "Invigilator"
        exam_name = instance.exam_venue.exam.exam_name if instance.exam_venue and instance.exam_venue.exam else "an exam"
        log_notification("cancellation", f"{name} cancelled a shift for {exam_name}.", user=self.request.user)
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
