from django.db import DatabaseError, connection
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.views.generic import TemplateView

from .services import process_uploaded_file


class HomePageView(TemplateView):
    template_name = "timetabling_system/home.html"


class AboutPageView(TemplateView):
    template_name = "timetabling_system/about.html"


def healthz_view(_request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except DatabaseError as exc:
        return JsonResponse(
            {
                "status": "error",
                "services": {
                    "database": {"status": "error", "error": str(exc)},
                },
            },
            status=503,
        )

    return JsonResponse(
        {
            "status": "ok",
            "services": {
                "database": {"status": "ok"},
            },
        }
    )


@csrf_exempt
@require_POST
def upload_timetable_file(request):
    upload = request.FILES.get("file")
    if not upload:
        return JsonResponse(
            {"status": "error", "message": "No file uploaded."}, status=400
        )

    result = process_uploaded_file(upload, request.user)

    if result.get("status") == "ok":
        result.setdefault("message", "Upload processed successfully.")
        result.setdefault("count", result.get("rows_processed", 0))
        return JsonResponse(result)

    return JsonResponse(result, status=400)
