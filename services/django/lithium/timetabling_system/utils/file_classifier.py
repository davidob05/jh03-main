# timetabling_system/utils/file_classifier.py

def detect_provision_file(df):
    print("Detecting provision file...")
    """Provision files contain student + registry info."""
    cols = set(df.columns)

    provision_indicators = {
        "student_id", "mock_ids", "registry",
        "additional_information", "provisions", "student_name"
    }

    return len(cols & provision_indicators) > 0


def detect_exam_file(df):
    print("Detecting exam file...")
    """Exam files contain exam session fields but no student data."""
    cols = set(df.columns)

    exam_indicators = {
        "exam_code",
        "exam_name",
        "exam_date",
        "exam_start",
        "main_venue",
        "exam_type"
    }

    # Must match at least 2 exam indicators AND must NOT look like provision file
    return (
        len(cols & exam_indicators) >= 2 
        and not detect_provision_file(df)
    )


def detect_venue_file(df):
    print("Detecting venue file...")
    """
    Venue files are column-based:
    Row 1 = day names
    Row 2 = dates
    Rows 3.. = room names
    """
    try:
        first_row = df.iloc[0].astype(str).str.lower()
        second_row = df.iloc[1].astype(str)

        # Check if first row contains weekday names
        weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"]
        weekday_hits = sum(any(day in cell for day in weekdays) for cell in first_row)

        # Check if second row looks like dates (contains "/")
        date_hits = sum("/" in cell for cell in second_row)

        return weekday_hits >= 1 and date_hits >= 1

    except Exception:
        return False
