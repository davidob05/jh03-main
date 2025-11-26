# timetabling_system/utils/file_classifier.py

import math
from datetime import date, datetime

from .column_mapper import normalize


def _normalized_columns(df):
    return {normalize(col) for col in df.columns}


def detect_provision_file(df):
    print("Detecting provision file...")
    """Provision files contain student + registry info."""
    cols = _normalized_columns(df)

    provision_indicators = {
        "student_id", "student_name", "provisions",
        "additional_info", "registry", "mock_ids"
    }
    strong_hits = len(cols & provision_indicators)

    studentish = sum("student" in col for col in cols)
    provisionish = sum(any(term in col for term in ("provision", "registry", "adjustment")) for col in cols)

    return strong_hits >= 2 or (studentish >= 1 and provisionish >= 1)


def detect_exam_file(df):
    print("Detecting exam file...")
    """Exam files contain exam session fields but no student data."""
    cols = _normalized_columns(df)

    exam_indicators = {
        "exam_code",
        "exam_name",
        "exam_date",
        "exam_start",
        "main_venue",
        "exam_type",
        "exam_end",
        "exam_length",
    }

    exam_hits = len(cols & exam_indicators)

    return exam_hits >= 2 and not detect_provision_file(df)


def _looks_like_date_cell(val):
    if val is None:
        return False

    if isinstance(val, (datetime, date)):
        return True

    # pandas can give floats/ints for Excel serial dates
    if isinstance(val, (int, float)):
        if isinstance(val, float) and math.isnan(val):
            return False
        return val >= 40000  # Excel serial dates start around 1900 -> 40000+

    text = str(val).strip()
    if not text:
        return False

    lowered = text.lower()
    if any(sep in lowered for sep in ("/", "-")):
        return True

    if lowered.isdigit() and len(lowered) >= 5:
        return True

    try:
        num = float(lowered)
        return num >= 40000
    except (ValueError, TypeError):
        return False


def detect_venue_file(df):
    print("Detecting venue file...")
    """
    Venue files are column-based:
    Row 1 = day names
    Row 2 = dates
    Rows 3.. = room names
    """
    weekdays = ("monday", "tuesday", "wednesday", "thursday", "friday", "sat", "sun", "saturday", "sunday")

    def weekday_hits(seq):
        return sum(any(day in str(cell).lower() for day in weekdays) for cell in seq)

    def date_hits(seq):
        return sum(_looks_like_date_cell(cell) for cell in seq)

    try:
        # Case 1: worksheets treated as data rows (no header)
        if len(df.index) >= 2:
            first_row = df.iloc[0]
            second_row = df.iloc[1]
            if weekday_hits(first_row) >= 1 and date_hits(second_row) >= 1:
                return True

        # Case 2: pandas used first row as header, so weekdays sit in columns
        if len(df.columns) >= 1 and len(df.index) >= 1:
            if weekday_hits(df.columns) >= 1 and date_hits(df.iloc[0]) >= 1:
                return True

        return False

    except Exception:
        return False
