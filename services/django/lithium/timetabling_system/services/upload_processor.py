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
    ExamVenue,
    ExamVenueProvisionType,
    Venue,
    VenueType,
    UploadLog,
)
from timetabling_system.services.venue_matching import (
    venue_has_timing_conflict,
    venue_is_available,
    venue_supports_caps,
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
    elif file_type == "Venue":
        summary = _import_venue_days(result.get("days", []))
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


def _core_exam_timing(exam: Exam) -> tuple[Optional[datetime], Optional[int]]:
    """
    Return the core exam start_time and length from the primary ExamVenue rows.
    """
    if not exam:
        return None, None
    core_ev = exam.examvenue_set.filter(core=True).order_by("pk").first()
    if core_ev:
        return core_ev.start_time, core_ev.exam_length
    fallback = exam.examvenue_set.order_by("pk").first()
    if fallback:
        return fallback.start_time, fallback.exam_length
    return None, None


def _extra_time_minutes(provisions: List[str], base_length: Optional[int]) -> int:
    """
    Derive extra time in minutes from provision codes.
    We take the maximum applicable extra-time rule.
    """
    base = base_length or 0
    extras: List[int] = []
    for prov in provisions or []:
        if prov == ProvisionType.EXTRA_TIME_100:
            extras.append(base)
        elif prov == ProvisionType.EXTRA_TIME_30_PER_HOUR:
            extras.append(math.ceil(base / 60 * 30))
        elif prov == ProvisionType.EXTRA_TIME_20_PER_HOUR:
            extras.append(math.ceil(base / 60 * 20))
        elif prov == ProvisionType.EXTRA_TIME_15_PER_HOUR:
            extras.append(math.ceil(base / 60 * 15))
        elif prov == ProvisionType.EXTRA_TIME:
            extras.append(math.ceil(base * 0.25))
    return max(extras) if extras else 0


def _apply_extra_time(
    base_start: Optional[datetime],
    base_length: Optional[int],
    extra_minutes: int,
) -> tuple[Optional[datetime], Optional[int]]:
    """
    Shift the start earlier where possible (not before 09:00),
    with any remaining extra added to the end (exam_length).
    """
    if extra_minutes <= 0:
        return base_start, base_length

    new_start = base_start
    remaining = extra_minutes

    if base_start:
        earliest = base_start.replace(hour=9, minute=0, second=0, microsecond=0)
        minutes_available = max(
            0, int((base_start - earliest).total_seconds() // 60)
        )
        shift = min(remaining, minutes_available)
        if shift:
            new_start = base_start - timedelta(minutes=shift)
            remaining -= shift

    if base_length is None:
        new_length = None if remaining == 0 else remaining
    else:
        new_length = base_length + remaining

    return new_start, new_length


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

        exam_obj, created = Exam.objects.update_or_create(
            course_code=payload["course_code"],
            defaults=payload["defaults"],
        )
        if created:
            summary["created"] += 1
        else:
            summary["updated"] += 1

        _create_exam_venue_links(
            exam_obj,
            raw,
            start_time=payload["start_time"],
            exam_length=payload["exam_length"],
        )

    return summary


def _build_exam_payload(row: Dict[str, Any]) -> Dict[str, Any]:
    course_code = _clean_string(row.get("course_code") or row.get("exam_code"), max_length=30)
    if not course_code:
        raise ValueError("Missing exam_code / course_code.")

    exam_date = _coerce_date(row.get("exam_date"))
    start_dt = _combine_start_datetime(row.get("exam_start"), exam_date)
    start_dt = _ensure_aware(start_dt) if start_dt else None
    duration = _duration_in_minutes(row.get("exam_length"), row.get("exam_end"), start_dt)
    duration = duration if duration > 0 else None

    defaults = {
        "exam_name": _clean_string(row.get("exam_name"), max_length=30) or course_code,
        "exam_type": _clean_string(row.get("exam_type"), max_length=30) or "Exam",
        "no_students": _coerce_int(row.get("no_students")) or 0,
        "exam_school": _clean_string(row.get("school"), max_length=30) or "Unassigned",
        "school_contact": _clean_string(row.get("school_contact"), max_length=100),
    }

    return {
        "course_code": course_code,
        "defaults": defaults,
        "start_time": start_dt,
        "exam_length": duration,
    }


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
# Common shorthand/synonyms from legacy data
PROVISION_SLUG_MAP.update({
    "reader": ProvisionType.READER,
    "use_reader": ProvisionType.READER,
    "useofareader": ProvisionType.READER,
    "scribe": ProvisionType.SCRIBE,
    "use_scribe": ProvisionType.SCRIBE,
    "useofascribe": ProvisionType.SCRIBE,
    "computer": ProvisionType.USE_COMPUTER,
    "use_computer": ProvisionType.USE_COMPUTER,
    "extra_time": ProvisionType.EXTRA_TIME,
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

        provisions = _normalize_provisions(raw.get("provisions"))
        notes = _clean_string(raw.get("additional_info") or raw.get("notes"), max_length=200)

        provision_obj, created = Provisions.objects.update_or_create(
            student=student,
            exam=exam,
            defaults={
                "provisions": provisions,
                "notes": notes or None,
            },
        )

        student_exam, _ = StudentExam.objects.get_or_create(student=student, exam=exam)
        required_caps = _required_capabilities(provisions)
        needs_accessible = _needs_accessible_venue(provisions)
        requires_separate_room = _needs_separate_room(provisions)
        needs_computer = _needs_computer(provisions)
        core_ev = (
            exam.examvenue_set.select_related("venue")
            .filter(core=True, venue__isnull=False)
            .order_by("pk")
            .first()
        )
        core_venue = core_ev.venue if core_ev else None
        base_start, base_length = _core_exam_timing(exam)
        extra_minutes = _extra_time_minutes(provisions, base_length)
        target_start, target_length = _apply_extra_time(base_start, base_length, extra_minutes)
        small_extra_time = _has_small_extra_time(extra_minutes, base_length)
        preferred_venue = None
        if small_extra_time and not requires_separate_room and not needs_computer:
            preferred_venue = core_venue
            if needs_accessible and preferred_venue and not preferred_venue.is_accessible:
                preferred_venue = None
        allow_same_exam_overlap = bool(preferred_venue and small_extra_time)

        exam_venue = _find_matching_exam_venue(
            exam,
            required_caps,
            target_start,
            target_length,
            require_accessible=needs_accessible,
            preferred_venue=preferred_venue,
        )
        if not exam_venue:
            exam_venue = _allocate_exam_venue(
                exam,
                required_caps,
                target_start,
                target_length,
                require_accessible=needs_accessible,
                preferred_venue=preferred_venue,
                allow_same_exam_overlap=allow_same_exam_overlap,
            )

        if exam_venue:
            updates = []
            if target_start and exam_venue.start_time != target_start:
                exam_venue.start_time = target_start
                updates.append("start_time")
            if target_length is not None and exam_venue.exam_length != target_length:
                exam_venue.exam_length = target_length
                updates.append("exam_length")
            existing_caps = exam_venue.provision_capabilities or []
            if required_caps and not all(cap in existing_caps for cap in required_caps):
                exam_venue.provision_capabilities = sorted(set(existing_caps + required_caps))
                updates.append("provision_capabilities")
            if updates:
                exam_venue.save(update_fields=updates)

        if exam_venue and student_exam.exam_venue_id != exam_venue.pk:
            student_exam.exam_venue = exam_venue
            student_exam.save(update_fields=["exam_venue"])

        if created:
            summary["created"] += 1
        else:
            summary["updated"] += 1

    return summary

def _create_provision_exam_venues():
    provision_list = Provisions.objects.all()
    for provision in provision_list:
        evs = ExamVenue.objects.all(exam=provision.exam)

def _extract_venue_names(row: Dict[str, Any]) -> List[str]:
    raw_value = row.get("main_venue") or row.get("venue")
    if _is_missing(raw_value):
        return []
    if isinstance(raw_value, (list, tuple, set)):
        tokens = raw_value
    else:
        tokens = re.split(r"[;,/|]", str(raw_value))
    normalized: List[str] = []
    for token in tokens:
        name = _clean_string(token, max_length=255)
        if name:
            normalized.append(name)
    return normalized


def _required_capabilities(provisions: List[str]) -> List[str]:
    mapping = {
        ProvisionType.SEPARATE_ROOM_ON_OWN: ExamVenueProvisionType.SEPARATE_ROOM_ON_OWN,
        ProvisionType.SEPARATE_ROOM_NOT_ON_OWN: ExamVenueProvisionType.SEPARATE_ROOM_NOT_ON_OWN,
        ProvisionType.USE_COMPUTER: ExamVenueProvisionType.USE_COMPUTER,
        ProvisionType.ACCESSIBLE_HALL: ExamVenueProvisionType.ACCESSIBLE_HALL,
        ProvisionType.ASSISTED_EVAC_REQUIRED: ExamVenueProvisionType.ACCESSIBLE_HALL,
    }
    caps: List[str] = []
    for prov in provisions or []:
        cap = mapping.get(prov)
        if cap and cap not in caps:
            caps.append(cap)
    return caps


def _needs_accessible_venue(provisions: List[str]) -> bool:
    return (
        ProvisionType.ACCESSIBLE_HALL in provisions
        or ProvisionType.ASSISTED_EVAC_REQUIRED in provisions
    )


def _needs_separate_room(provisions: List[str]) -> bool:
    return any(
        prov in (ProvisionType.SEPARATE_ROOM_ON_OWN, ProvisionType.SEPARATE_ROOM_NOT_ON_OWN)
        for prov in provisions or []
    )


def _needs_computer(provisions: List[str]) -> bool:
    return ProvisionType.USE_COMPUTER in (provisions or [])


def _has_small_extra_time(extra_minutes: int, base_length: Optional[int]) -> bool:
    """
    Returns True when the extra time allowance is <= 15 minutes per hour.
    """
    if extra_minutes <= 0 or not base_length:
        return False
    hours = base_length / 60
    if hours <= 0:
        return False
    per_hour = extra_minutes / hours
    return per_hour <= 15


def _find_matching_exam_venue(
    exam: Exam,
    required_caps: List[str],
    target_start: Optional[datetime],
    target_length: Optional[int],
    *,
    require_accessible: bool = False,
    preferred_venue: Optional[Venue] = None,
) -> Optional[ExamVenue]:
    if not exam:
        return None

    evs = list(ExamVenue.objects.filter(exam=exam).select_related("venue"))

    def _matches(ev: ExamVenue) -> bool:
        if ev.venue:
            if required_caps and not venue_supports_caps(ev.venue, required_caps):
                return False
            if require_accessible and not ev.venue.is_accessible:
                return False
        else:
            placeholder_caps = ev.provision_capabilities or []
            if required_caps and not all(cap in placeholder_caps for cap in required_caps):
                return False

        if target_start and ev.start_time != target_start:
            return False
        if target_length is not None and ev.exam_length != target_length:
            return False
        return True

    if preferred_venue:
        for ev in evs:
            if ev.venue_id == preferred_venue.pk and _matches(ev):
                return ev

    for ev in evs:
        if _matches(ev):
            return ev
    return None


def _allocate_exam_venue(
    exam: Exam,
    required_caps: List[str],
    target_start: Optional[datetime],
    target_length: Optional[int],
    *,
    require_accessible: bool = False,
    preferred_venue: Optional[Venue] = None,
    allow_same_exam_overlap: bool = False,
) -> Optional[ExamVenue]:
    if not exam:
        return None

    exam_date = getattr(exam, "date_exam", None)
    iso_date = exam_date.isoformat() if exam_date else None
    requires_separate_room = any(
        cap in required_caps
        for cap in (
            ExamVenueProvisionType.SEPARATE_ROOM_ON_OWN,
            ExamVenueProvisionType.SEPARATE_ROOM_NOT_ON_OWN,
        )
    )
    needs_computer = ExamVenueProvisionType.USE_COMPUTER in required_caps

    allowed_types = None
    if needs_computer:
        allowed_types = {
            VenueType.COMPUTER_CLUSTER,
            VenueType.PURPLE_CLUSTER,
            VenueType.SEPARATE_ROOM,
        }
    elif requires_separate_room:
        allowed_types = {VenueType.SEPARATE_ROOM}

    def _merge_caps(ev: ExamVenue) -> List[str]:
        existing = ev.provision_capabilities or []
        merged = sorted(set(existing + (required_caps or [])))
        return merged

    candidates: List[Venue] = []
    candidate_order: List[Venue] = []

    if preferred_venue:
        candidate_order.append(preferred_venue)

    # Prefer the venue(s) already linked to the core exam venue rows.
    core_venues = [
        ev.venue for ev in exam.examvenue_set.select_related("venue").filter(core=True, venue__isnull=False)
    ]
    candidate_order.extend(core_venues)
    candidate_order.extend(list(Venue.objects.all()))

    seen_names = set()
    for venue in candidate_order:
        if not venue or venue.venue_name in seen_names:
            continue
        seen_names.add(venue.venue_name)
        if allowed_types and venue.venuetype not in allowed_types:
            continue
        if required_caps and not venue_supports_caps(venue, required_caps):
            continue
        if require_accessible and not venue.is_accessible:
            continue
        if not venue_is_available(venue, target_start):
            continue
        if venue_has_timing_conflict(
            venue,
            target_start,
            target_length,
            ignore_exam_id=exam.exam_id,
            allow_same_exam_overlap=allow_same_exam_overlap,
        ):
            continue
        availability = venue.availability or []
        if iso_date and availability and iso_date not in availability:
            continue
        candidates.append(venue)

    placeholder = ExamVenue.objects.filter(exam=exam, venue__isnull=True).first()

    if not candidates:
        if placeholder:
            updates = []
            merged = _merge_caps(placeholder)
            if merged != (placeholder.provision_capabilities or []):
                placeholder.provision_capabilities = merged
                updates.append("provision_capabilities")
            if target_start and placeholder.start_time != target_start:
                placeholder.start_time = target_start
                updates.append("start_time")
            if target_length is not None and placeholder.exam_length != target_length:
                placeholder.exam_length = target_length
                updates.append("exam_length")
            if updates:
                placeholder.save(update_fields=updates)
            return placeholder

        return ExamVenue.objects.create(
            exam=exam,
            venue=None,
            start_time=target_start,
            exam_length=target_length,
            provision_capabilities=required_caps,
        )

    selected = candidates[0]
    if placeholder:
        updates = ["venue"]
        placeholder.venue = selected
        merged = _merge_caps(placeholder)
        if merged != (placeholder.provision_capabilities or []):
            placeholder.provision_capabilities = merged
            updates.append("provision_capabilities")
        if target_start and placeholder.start_time != target_start:
            placeholder.start_time = target_start
            updates.append("start_time")
        if target_length is not None and placeholder.exam_length != target_length:
            placeholder.exam_length = target_length
            updates.append("exam_length")
        placeholder.save(update_fields=updates)
        return placeholder

    existing = ExamVenue.objects.filter(
        exam=exam,
        venue=selected,
        start_time=target_start,
        exam_length=target_length,
    ).first()

    if existing:
        merged = _merge_caps(existing)
        if merged != (existing.provision_capabilities or []):
            existing.provision_capabilities = merged
            existing.save(update_fields=["provision_capabilities"])
        return existing

    return ExamVenue.objects.create(
        exam=exam,
        venue=selected,
        start_time=target_start,
        exam_length=target_length,
        provision_capabilities=required_caps,
    )


def _create_exam_venue_links(
    exam: Exam,
    raw_row: Dict[str, Any],
    *,
    start_time: Optional[datetime] = None,
    exam_length: Optional[int] = None,
) -> None:
    """
    Ensure Venue rows exist for each venue name in the exam upload,
    and create ExamVenue links to the associated exam.
    """
    if not exam:
        return

    venue_names = _extract_venue_names(raw_row)
    if not venue_names:
        return

    seen = set()
    for name in venue_names:
        if name in seen:
            continue
        seen.add(name)

        defaults = {
            "capacity": 0,
            "venuetype": VenueType.SCHOOL_TO_SORT,
            "is_accessible": True,
            "qualifications": [],
        }
        venue, _ = Venue.objects.get_or_create(
            venue_name=name,
            defaults=defaults,
        )

        if not venue_is_available(venue, start_time):
            # If the venue is not available on this date, fall back to a placeholder.
            exam_venue = ExamVenue.objects.filter(exam=exam, venue__isnull=True).first()
            if not exam_venue:
                ExamVenue.objects.create(
                    exam=exam,
                    venue=None,
                    start_time=start_time,
                    exam_length=exam_length,
                    core=True,
                )
            continue

        conflict = venue_has_timing_conflict(
            venue, start_time, exam_length, ignore_exam_id=exam.exam_id
        )

        if conflict:
            exam_venue = ExamVenue.objects.filter(exam=exam, venue__isnull=True).first()
            if not exam_venue:
                exam_venue = ExamVenue.objects.create(
                    exam=exam,
                    venue=None,
                    start_time=start_time,
                    exam_length=exam_length,
                    core=True,
                )
            else:
                updates = []
                if start_time and exam_venue.start_time != start_time:
                    exam_venue.start_time = start_time
                    updates.append("start_time")
                if exam_length is not None and exam_venue.exam_length != exam_length:
                    exam_venue.exam_length = exam_length
                    updates.append("exam_length")
                if exam_venue.core is not True:
                    exam_venue.core = True
                    updates.append("core")
                if updates:
                    exam_venue.save(update_fields=updates)
            continue

        exam_venue, created = ExamVenue.objects.get_or_create(
            exam=exam,
            venue=venue,
            defaults={
                "start_time": start_time,
                "exam_length": exam_length,
                "core": True,
            },
        )

        updates = []
        if start_time and exam_venue.start_time != start_time:
            exam_venue.start_time = start_time
            updates.append("start_time")
        if exam_length is not None and exam_venue.exam_length != exam_length:
            exam_venue.exam_length = exam_length
            updates.append("exam_length")
        if created and exam_venue.core is not True:
            exam_venue.core = True
            updates.append("core")
        if updates and not created:
            exam_venue.save(update_fields=updates)


@transaction.atomic
def _import_venue_days(days: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Venue uploads carry a list of day blocks, each with a list of rooms.
    We treat each room as a Venue row and upsert by venue_name.
    """
    
    rooms: List[Dict[str, Any]] = []
    for day in days or []:
        day_date = _coerce_date(day.get("date"))
        for room in day.get("rooms", []):
            room_copy = dict(room)
            room_copy["_day_date"] = day_date
            room_copy["_day_name"] = day.get("day")
            rooms.append(room_copy)

    summary = _base_summary(len(rooms))

    for idx, room in enumerate(rooms, start=1):
        name = _clean_string(room.get("name"), max_length=255)
        if not name:
            summary["skipped"] += 1
            summary["errors"].append(f"Room {idx}: Missing name.")
            continue

        cap_val = _coerce_int(room.get("capacity"))
        defaults = {
            "capacity": cap_val if cap_val is not None else 0,
            "venuetype": room.get("venuetype") or VenueType.SCHOOL_TO_SORT,
            "is_accessible": bool(room.get("accessible", True)),
            "qualifications": room.get("qualifications") or [],
            "availability": [],
        }

        day_date = room.get("_day_date")
        if day_date:
            defaults["availability"] = [day_date.isoformat()]

        venue_obj, created = Venue.objects.get_or_create(
            venue_name=name,
            defaults=defaults,
        )

        updated_fields = []
        for field in ("venuetype", "is_accessible", "qualifications"):
            if getattr(venue_obj, field) != defaults[field]:
                setattr(venue_obj, field, defaults[field])
                updated_fields.append(field)
        if cap_val is not None and venue_obj.capacity != cap_val:
            venue_obj.capacity = cap_val
            updated_fields.append("capacity")

        if defaults["availability"]:
            merged = sorted(set((venue_obj.availability or []) + defaults["availability"]))
            if merged != (venue_obj.availability or []):
                venue_obj.availability = merged
                updated_fields.append("availability")

        if updated_fields:
            venue_obj.save(update_fields=updated_fields)

        if created:
            summary["created"] += 1
        else:
            summary["updated"] += 1

    return summary
