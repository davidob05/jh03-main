import math
import re
from datetime import date, datetime, time, timedelta
from typing import Any, Dict, Iterable, List, Optional

from django.conf import settings
from django.db import transaction
from django.utils import dateparse, timezone

from timetabling_system.models import (
    Exam,
    ProvisionType,
    Provisions,
    Student,
    StudentExam,
    UploadLog,
)


def ingest_upload_result(
    result: Dict[str, Any],
    *,
    file_name: str,
    uploaded_by: Optional[Any] = None,
) -> Optional[Dict[str, Any]]:
    """
    Persist parsed upload results into the relational models.

    Returns a summary dictionary that is merged back into the API response.
    Unsupported file types return a handled=False summary so callers can show
    a helpful message without treating the upload as an error.
    """

    if not result or result.get("status") != "ok":
        return None

    file_type = result.get("type")
    rows: Iterable[Dict[str, Any]] = result.get("rows", [])

    if file_type == "Exam":
        summary = _import_exam_rows(rows)
    elif file_type == "Provisions":
        summary = _import_provision_rows(rows)
    else:
        return {
            "handled": False,
            "type": file_type,
            "created": 0,
            "updated": 0,
            "skipped": 0,
            "errors": [],
            "message": f"No persistence configured for {file_type or 'unknown'} uploads.",
        }

    summary["handled"] = True
    summary["type"] = file_type

    user = uploaded_by if getattr(uploaded_by, "is_authenticated", False) else None
    UploadLog.objects.create(
        file_name=file_name or result.get("file", "uploaded_file"),
        uploaded_by=user,
        records_created=summary["created"],
        records_updated=summary["updated"],
    )

    return summary


def _base_summary(total_rows: int) -> Dict[str, Any]:
    return {
        "created": 0,
        "updated": 0,
        "skipped": 0,
        "total_rows": total_rows,
        "errors": [],
    }


def _maybe_to_datetime(value: Any) -> Any:
    if hasattr(value, "to_pydatetime"):
        try:
            return value.to_pydatetime()
        except (TypeError, ValueError):
            return None
    return value


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    try:
        return value != value  # catches NaN / NaT
    except Exception:
        return False


def _clean_string(value: Any, *, max_length: Optional[int] = None) -> str:
    if _is_missing(value):
        return ""
    text = str(value).strip()
    if max_length is not None:
        return text[:max_length]
    return text


def _coerce_date(value: Any) -> Optional[date]:
    if _is_missing(value):
        return None
    value = _maybe_to_datetime(value)
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        parsed = dateparse.parse_date(stripped)
        if parsed:
            return parsed
        parsed_dt = dateparse.parse_datetime(stripped)
        if parsed_dt:
            return parsed_dt.date()
    return None


def _coerce_datetime(value: Any) -> Optional[datetime]:
    if _is_missing(value):
        return None
    value = _maybe_to_datetime(value)
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        return dateparse.parse_datetime(stripped)
    return None


def _time_from_digits(text: str) -> Optional[time]:
    digits = re.sub(r"[^0-9]", "", text)
    if len(digits) in (3, 4):
        hours = int(digits[:-2])
        minutes = int(digits[-2:])
        if 0 <= hours < 24 and 0 <= minutes < 60:
            return time(hour=hours, minute=minutes)
    return None


def _coerce_time(value: Any) -> Optional[time]:
    if _is_missing(value):
        return None
    value = _maybe_to_datetime(value)
    if isinstance(value, datetime):
        return value.time()
    if isinstance(value, time):
        return value
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        parsed = dateparse.parse_time(stripped)
        if parsed:
            return parsed
        parsed_dt = dateparse.parse_datetime(stripped)
        if parsed_dt:
            return parsed_dt.time()
        fallback = _time_from_digits(stripped)
        if fallback:
            return fallback
    if isinstance(value, (int, float)):
        try:
            fractional = float(value)
        except (TypeError, ValueError):
            return None
        seconds = int(round(fractional * 24 * 3600))
        seconds %= 24 * 3600
        hours, remainder = divmod(seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        return time(hour=hours, minute=minutes, second=seconds)
    return None


def _coerce_int(value: Any) -> Optional[int]:
    if _is_missing(value):
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if math.isnan(value):
            return None
        return int(round(value))
    text = str(value).strip().lower()
    if not text:
        return None
    if ":" in text:
        parts = [p for p in text.split(":") if p]
        if len(parts) >= 2:
            try:
                hours = int(parts[0])
                minutes = int(parts[1])
                return hours * 60 + minutes
            except ValueError:
                pass
    hour_match = re.search(r"(\d+)\s*h", text)
    minute_match = re.search(r"(\d+)\s*m", text)
    if hour_match or minute_match:
        hours = int(hour_match.group(1)) if hour_match else 0
        minutes = int(minute_match.group(1)) if minute_match else 0
        return hours * 60 + minutes
    digits = re.findall(r"\d+", text)
    if digits:
        return int(digits[0])
    return None


def _ensure_aware(dt: datetime) -> datetime:
    if not dt:
        return dt
    current_tz = timezone.get_default_timezone()
    if settings.USE_TZ and timezone.is_naive(dt):
        return timezone.make_aware(dt, current_tz)
    if not settings.USE_TZ and timezone.is_aware(dt):
        return timezone.make_naive(dt, current_tz)
    return dt


def _combine_start_datetime(start_value: Any, exam_date: date) -> Optional[datetime]:
    direct = _coerce_datetime(start_value)
    if direct:
        return direct
    date_value = _coerce_date(exam_date)
    time_value = _coerce_time(start_value)
    if date_value and time_value:
        return datetime.combine(date_value, time_value)
    if isinstance(exam_date, datetime):
        return exam_date
    return None


def _duration_in_minutes(length_value: Any, end_value: Any, start_dt: Optional[datetime]) -> int:
    duration = _coerce_int(length_value)
    if duration is not None:
        return max(duration, 0)
    end_time = _coerce_time(end_value)
    if start_dt and end_time:
        end_dt = datetime.combine(start_dt.date(), end_time)
        if end_dt < start_dt:
            end_dt += timedelta(days=1)
        return max(int((end_dt - start_dt).total_seconds() // 60), 0)
    return 0


@transaction.atomic
def _import_exam_rows(rows: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    rows_list = list(rows or [])
    summary = _base_summary(len(rows_list))

    for idx, raw in enumerate(rows_list, start=1):
        try:
            payload = _build_exam_payload(raw)
        except ValueError as exc:
            summary["skipped"] += 1
            summary["errors"].append(f"Row {idx}: {exc}")
            continue

        _, created = Exam.objects.update_or_create(
            course_code=payload["course_code"],
            defaults=payload["defaults"],
        )
        if created:
            summary["created"] += 1
        else:
            summary["updated"] += 1

    return summary


def _build_exam_payload(row: Dict[str, Any]) -> Dict[str, Any]:
    course_code = _clean_string(row.get("course_code") or row.get("exam_code"), max_length=30)
    if not course_code:
        raise ValueError("Missing exam_code / course_code.")

    exam_date = _coerce_date(row.get("exam_date"))
    if not exam_date:
        raise ValueError("Missing exam_date.")

    start_dt = _combine_start_datetime(row.get("exam_start"), exam_date)
    if not start_dt:
        raise ValueError("Missing exam_start or unable to parse start time.")

    start_dt = _ensure_aware(start_dt)
    exam_length = _duration_in_minutes(row.get("exam_length"), row.get("exam_end"), start_dt)

    defaults = {
        "exam_name": _clean_string(row.get("exam_name"), max_length=30) or course_code,
        "exam_length": exam_length,
        "start_time": start_dt,
        "exam_type": _clean_string(row.get("exam_type"), max_length=30) or "Exam",
        "no_students": _coerce_int(row.get("no_students")) or 0,
        "exam_school": _clean_string(row.get("school"), max_length=30) or "Unassigned",
        "date_exam": exam_date,
        "school_contact": _clean_string(row.get("school_contact"), max_length=100),
    }

    return {"course_code": course_code, "defaults": defaults}


def _slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9_]+", "", str(value).strip().lower().replace(" ", "_"))


PROVISION_SLUG_MAP = {
    _slugify(choice.value): choice.value
    for choice in ProvisionType
}
PROVISION_SLUG_MAP.update({
    _slugify(choice.label): choice.value
    for choice in ProvisionType
})


def _normalize_provisions(value: Any) -> List[str]:
    if _is_missing(value):
        return []
    if isinstance(value, (list, tuple, set)):
        tokens = value
    else:
        tokens = re.split(r"[;,/]", str(value))

    normalized: List[str] = []
    seen = set()
    for token in tokens:
        slug = _slugify(token)
        mapped = PROVISION_SLUG_MAP.get(slug)
        if mapped and mapped not in seen:
            normalized.append(mapped)
            seen.add(mapped)
    return normalized


@transaction.atomic
def _import_provision_rows(rows: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    rows_list = list(rows or [])
    summary = _base_summary(len(rows_list))

    for idx, raw in enumerate(rows_list, start=1):
        student_id = _clean_string(
            raw.get("student_id") or raw.get("mock_ids") or raw.get("id"),
            max_length=255,
        )
        if not student_id:
            summary["skipped"] += 1
            summary["errors"].append(f"Row {idx}: Missing student_id.")
            continue

        exam_code = _clean_string(raw.get("exam_code") or raw.get("course_code"), max_length=30)
        if not exam_code:
            summary["skipped"] += 1
            summary["errors"].append(f"Row {idx}: Missing exam_code.")
            continue

        try:
            exam = Exam.objects.get(course_code=exam_code)
        except Exam.DoesNotExist:
            summary["skipped"] += 1
            summary["errors"].append(f"Row {idx}: Exam with code '{exam_code}' not found.")
            continue

        student, _ = Student.objects.update_or_create(
            student_id=student_id,
            defaults={
                "student_name": _clean_string(raw.get("student_name"), max_length=255) or student_id,
            },
        )

        StudentExam.objects.get_or_create(student=student, exam=exam)

        provisions = _normalize_provisions(raw.get("provisions"))
        notes = _clean_string(raw.get("additional_info") or raw.get("notes"), max_length=200)

        _, created = Provisions.objects.update_or_create(
            student=student,
            exam=exam,
            defaults={
                "provisions": provisions,
                "notes": notes or None,
            },
        )

        if created:
            summary["created"] += 1
        else:
            summary["updated"] += 1

    return summary
