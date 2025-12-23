from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from timetabling_system.models import (
    Exam,
    ExamVenue,
    Invigilator,
    InvigilatorAssignment,
    Venue,
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
    VenueWriteSerializer
)

class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all().prefetch_related("examvenue_set__venue")
    serializer_class = ExamSerializer


class VenueViewSet(viewsets.ModelViewSet):
    queryset = Venue.objects.all().prefetch_related("examvenue_set__exam")
    serializer_class = VenueSerializer

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return VenueWriteSerializer
        return VenueSerializer


class ExamVenueViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for ExamVenue rows.
    - Core venues are read-only and cannot be updated or deleted here.
    - Creation requires an existing Exam and an optional existing Venue name.
    """

    queryset = ExamVenue.objects.select_related("exam", "venue").all()

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ExamVenueWriteSerializer
        return ExamVenueSerializer

    def perform_destroy(self, instance):
        if instance.core:
            raise ValidationError("Core exam venues cannot be deleted.")
        return super().perform_destroy(instance)


class InvigilatorViewSet(viewsets.ModelViewSet):
    queryset = Invigilator.objects.select_related("user").prefetch_related(
        "assignments__exam_venue__exam",
        "assignments__exam_venue__venue",
        "availabilities",
    )
    serializer_class = InvigilatorSerializer


class InvigilatorAssignmentViewSet(viewsets.ModelViewSet):
    queryset = InvigilatorAssignment.objects.select_related(
        "invigilator",
        "exam_venue__exam",
        "exam_venue__venue",
    ).all()
    serializer_class = InvigilatorAssignmentSerializer


class TimetableUploadView(APIView):
    """Accepts an uploaded Excel file and routes it through the parser helpers."""
    parser_classes = (MultiPartParser, FormParser)


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
