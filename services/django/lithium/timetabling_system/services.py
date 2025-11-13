import math
import re
from datetime import date, datetime, time
from typing import Dict, List, Optional

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime, parse_time

from .models import (
    Exam,
    ExamVenue,
    ProvisionType,
    Provisions,
    Student,
    StudentExam,
    UploadLog,
    Venue,
    VenueType,
)
from .utils.excel_parser import parse_excel_file

PROVISION_KEYWORDS = {
    ProvisionType.EXTRA_TIME: ("extra time", "time extension", "extra-time"),
    ProvisionType.COMPUTER_NEEDED: ("computer", "pc", "laptop"),
    ProvisionType.READER: ("reader",),
    ProvisionType.SCRIBE: ("scribe",),
}


def process_uploaded_file(uploaded_file, user=None):
    """
    Accepts an uploaded Excel file, classifies it, and populates database tables.
    Returns a summary dict for API responses.
    """
    parsed = parse_excel_file(uploaded_file)
    if parsed.get("status") != "ok":
        return parsed

    file_type = parsed["type"]

    handlers = {
        "Exam": _import_exam_rows,
        "Provisions": _import_provision_rows,
        "Venue": _import_venue_days,
    }

    handler = handlers.get(file_type)
    if handler is None:
        return {
            "status": "error",
            "file": parsed.get("file"),
            "message": f"Unsupported file type: {file_type}",
        }

    with transaction.atomic():
        summary = handler(parsed)
        summary.update(
            {
                "status": "ok",
                "type": file_type,
                "file": parsed.get("file"),
            }
        )

        if summary["created"].get("total", 0) or summary["updated"].get("total", 0):
            UploadLog.objects.create(
                file_name=parsed.get("file", getattr(uploaded_file, "name", "upload")),
                uploaded_by=user if getattr(user, "is_authenticated", False) else None,
                records_created=summary["created"]["total"],
                records_updated=summary["updated"]["total"],
            )

    return summary


# ---------------------------------------------------------------------------
# Exam ingest helpers
# ---------------------------------------------------------------------------

def _import_exam_rows(parsed_payload: Dict) -> Dict:
    rows = parsed_payload.get("rows", [])
    created_counts = {"exams": 0, "venues": 0, "exam_venues": 0}
    updated_counts = {"exams": 0, "venues": 0, "exam_venues": 0}
    skipped = []
    processed = 0

    for row in rows:
        cleaned = _clean_row(row)
        exam_code = cleaned.get("exam_code") or cleaned.get("course_code")
        exam_name = cleaned.get("exam_name")
        exam_date = _coerce_date(cleaned.get("exam_date"))

        if not exam_code or not exam_name or not exam_date:
            skipped.append(
                {
                    "reason": "missing_required_fields",
                    "exam_code": exam_code,
                    "exam_name": exam_name,
                }
            )
            continue

        processed += 1

        start_time = _coerce_time(cleaned.get("exam_start")) or time(0, 0)
        start_dt = _combine_datetime(exam_date, start_time)

        exam_defaults = {
            "exam_name": exam_name,
            "exam_length": _parse_exam_length(cleaned.get("exam_length")),
            "start_time": start_dt,
            "exam_type": cleaned.get("exam_type") or "Unspecified",
            "no_students": _coerce_int(cleaned.get("no_students")),
            "exam_school": cleaned.get("school") or "Unknown",
            "date_exam": exam_date,
            "school_contact": cleaned.get("school_contact") or "",
            "course_code": exam_code,
        }

        exam, created = Exam.objects.update_or_create(
            course_code=exam_code,
            defaults=exam_defaults,
        )
        if created:
            created_counts["exams"] += 1
        else:
            updated_counts["exams"] += 1

        venue_name = cleaned.get("main_venue")
        if venue_name:
            venue_type_value = cleaned.get("venuetype")
            if venue_type_value not in VenueType.values:
                venue_type_value = VenueType.SCHOOL_TO_SORT

            venue, venue_created = Venue.objects.update_or_create(
                venue_name=venue_name,
                defaults={
                    "capacity": _coerce_int(cleaned.get("capacity"), default=0),
                    "venuetype": venue_type_value,
                    "is_accessible": True,
                    "qualifications": [],
                },
            )
            if venue_created:
                created_counts["venues"] += 1
            else:
                updated_counts["venues"] += 1

            exam_venue, exam_venue_created = ExamVenue.objects.update_or_create(
                exam=exam,
                venue=venue,
                defaults={
                    "adj_starttime": start_dt,
                },
            )
            if exam_venue_created:
                created_counts["exam_venues"] += 1
            else:
                updated_counts["exam_venues"] += 1

    return {
        "rows_processed": processed,
        "created": {
            "exams": created_counts["exams"],
            "venues": created_counts["venues"],
            "exam_venues": created_counts["exam_venues"],
            "total": sum(created_counts.values()),
        },
        "updated": {
            "exams": updated_counts["exams"],
            "venues": updated_counts["venues"],
            "exam_venues": updated_counts["exam_venues"],
            "total": sum(updated_counts.values()),
        },
        "skipped": skipped,
        "skipped_count": len(skipped),
    }


# ---------------------------------------------------------------------------
# Provision ingest helpers
# ---------------------------------------------------------------------------

def _import_provision_rows(parsed_payload: Dict) -> Dict:
    rows = parsed_payload.get("rows", [])
    created_counts = {"students": 0, "student_exams": 0, "provisions": 0}
    updated_counts = {"students": 0, "student_exams": 0, "provisions": 0}
    skipped = []
    processed = 0

    for row in rows:
        cleaned = _clean_row(row)
        student_id = cleaned.get("student_id")
        exam_code = cleaned.get("exam_code")

        if not student_id or not exam_code:
            skipped.append(
                {
                    "reason": "missing_student_or_exam",
                    "student_id": student_id,
                    "exam_code": exam_code,
                }
            )
            continue

        try:
            exam = Exam.objects.get(course_code=exam_code)
        except Exam.DoesNotExist:
            skipped.append({"reason": "unknown_exam", "exam_code": exam_code})
            continue

        processed += 1

        student_defaults = {
            "student_name": cleaned.get("student_name") or "",
        }
        student, created = Student.objects.update_or_create(
            student_id=student_id,
            defaults=student_defaults,
        )
        if created:
            created_counts["students"] += 1
        else:
            updated_counts["students"] += 1

        student_exam, se_created = StudentExam.objects.get_or_create(
            student=student,
            exam=exam,
        )
        if se_created:
            created_counts["student_exams"] += 1

        provision_values = _parse_provisions(cleaned.get("provisions"))
        provision_defaults = {
            "provisions": provision_values,
            "notes": cleaned.get("additional_info") or "",
        }

        provisions_obj, prov_created = Provisions.objects.update_or_create(
            exam=exam,
            student=student,
            defaults=provision_defaults,
        )
        if prov_created:
            created_counts["provisions"] += 1
        else:
            updated_counts["provisions"] += 1

    return {
        "rows_processed": processed,
        "created": {
            "students": created_counts["students"],
            "student_exams": created_counts["student_exams"],
            "provisions": created_counts["provisions"],
            "total": sum(created_counts.values()),
        },
        "updated": {
            "students": updated_counts["students"],
            "student_exams": updated_counts["student_exams"],
            "provisions": updated_counts["provisions"],
            "total": sum(updated_counts.values()),
        },
        "skipped": skipped,
        "skipped_count": len(skipped),
    }


# ---------------------------------------------------------------------------
# Venue ingest helpers
# ---------------------------------------------------------------------------

def _import_venue_days(parsed_payload: Dict) -> Dict:
    days = parsed_payload.get("days", [])
    created_counts = {"venues": 0}
    updated_counts = {"venues": 0}
    processed = 0

    for day in days:
        rooms = day.get("rooms", [])
        for room in rooms:
            venue_name = room.get("name")
            if not venue_name:
                continue

            processed += 1
            venue, created = Venue.objects.update_or_create(
                venue_name=venue_name,
                defaults={
                    "capacity": 0,
                    "venuetype": VenueType.SCHOOL_TO_SORT,
                    "is_accessible": room.get("accessible", True),
                    "qualifications": [],
                },
            )
            if created:
                created_counts["venues"] += 1
            else:
                updated_counts["venues"] += 1

    return {
        "rows_processed": processed,
        "created": {
            "venues": created_counts["venues"],
            "total": created_counts["venues"],
        },
        "updated": {
            "venues": updated_counts["venues"],
            "total": updated_counts["venues"],
        },
        "skipped": [],
        "skipped_count": 0,
    }


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def _clean_row(row: Dict) -> Dict:
    cleaned = {}
    for key, value in row.items():
        if value is None:
            cleaned[key] = None
            continue
        if isinstance(value, float) and math.isnan(value):
            cleaned[key] = None
            continue
        cleaned[key] = value
    return cleaned


def _coerce_date(value) -> Optional[date]:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        value = value.strip()
        dt = parse_datetime(value)
        if dt:
            return dt.date()
        return parse_date(value)
    return None


def _coerce_time(value) -> Optional[time]:
    if isinstance(value, datetime):
        return value.time()
    if isinstance(value, time):
        return value
    if isinstance(value, str):
        value = value.strip()
        parsed = parse_time(value)
        if parsed:
            return parsed
    return None


def _combine_datetime(date_value: date, time_value: time) -> datetime:
    dt = datetime.combine(date_value, time_value or time(0, 0))
    if timezone.is_naive(dt):
        return timezone.make_aware(dt)
    return dt


def _coerce_int(value, default: int = 0) -> int:
    if value is None:
        return default
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if math.isnan(value):
            return default
        return int(value)
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return default
        try:
            return int(value)
        except ValueError:
            return default
    return default


def _parse_exam_length(value) -> int:
    if isinstance(value, str) and ":" in value:
        hours, minutes = value.split(":", 1)
        try:
            return int(hours) * 60 + int(minutes)
        except ValueError:
            return 0
    return _coerce_int(value)


def _parse_provisions(value) -> List[str]:
    if not value:
        return []

    if isinstance(value, list):
        tokens = value
    else:
        tokens = re.split(r"[;,/\n]+", str(value))

    normalized = []
    for token in tokens:
        slug = token.strip().lower()
        if not slug:
            continue

        matched_code = _match_provision_slug(slug)
        if matched_code and matched_code not in normalized:
            normalized.append(matched_code)

    return normalized


def _match_provision_slug(slug: str) -> Optional[str]:
    for provision_code, keywords in PROVISION_KEYWORDS.items():
        if any(keyword in slug for keyword in keywords):
            return provision_code
    return None
