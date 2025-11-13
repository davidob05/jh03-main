
"""
Maps messy column names from Excel files to canonical internal names.
Canonical names are used throughout parsing and validation.
"""

EQUIVALENT_COLUMNS = {
#exam file fields
    "exam_code": [
        "exam code", "course code", "code"
    ],

    "exam_name": [
        "exam name", "assessment name", "module", "name"
    ],

    "exam_date": [
        "exam date", "date"
    ],

    "exam_start": [
        "exam start", "exam start time", "ol start", "oc start", "start"
    ],

    "exam_end": [
        "exam end", "exam finish", "ol finish", "oc finish", "end"
    ],

    "exam_length": [
        "exam length", "exam duration", "duration", "length", "time allowed"
    ],

    "exam_type": [
        "exam type", "assessment type", "type"
    ],

    "main_venue": [
        "main venue", "venue", "location", "room"
    ],

    "school": [
        "school", "department", "college"
    ],

   #provision fields
    "student_id": [
        "mock ids", "mock id", "student id", "id"
    ],

    "student_name": [
        "names", "student name", "name"
    ],

    "provisions": [
        "registry", "exam provision", "provision", "adjustments"
    ],

    "additional_info": [
        "additional information", "notes", "comments", "info"
    ],

    # -------------------------
    # Optional Fields Shared
    # -------------------------
    "exam_building": [
        "building", "site"
    ],

    # Empty mapping for venue-style structural detection
    # Actual parsing uses openpyxl, not column matching.
}
