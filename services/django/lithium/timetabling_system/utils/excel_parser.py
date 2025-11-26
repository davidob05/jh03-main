# timetabling_system/utils/excel_parser.py

import pandas as pd

from .column_mapper import map_equivalent_columns, normalize
from .file_classifier import (
    detect_provision_file,
    detect_venue_file,
    detect_exam_file
)
from .file_definitions import REQUIRED_COLUMNS
from .venue_parser import parse_venue_file


# --------------------------------------------------------------------------
# Load and normalize using pandas
# --------------------------------------------------------------------------

def load_pandas(file):
    """Loads the file as a pandas DataFrame with normalized headers."""
    df = pd.read_excel(file)

    # Normalize column names: lowercase, strip, underscores, no punctuation
    df.columns = [normalize(c) for c in df.columns]

    # Rename to canonical names when known
    mapping = map_equivalent_columns(df.columns)
    df.rename(columns=mapping, inplace=True)

    return df


# --------------------------------------------------------------------------
# Validate fields for exam + provision files
# --------------------------------------------------------------------------

def validate_required_columns(df, file_type):
    required = REQUIRED_COLUMNS[file_type]
    if not required:   # Venue has no required column list
        return []

    df_cols = set(df.columns)
    required_set = set(required)

    missing = list(required_set - df_cols)
    return missing


# --------------------------------------------------------------------------
# Main unified parser
# --------------------------------------------------------------------------

def parse_excel_file(file):
    """
    Detects the file type:
    - Exam timetable file (Exam)
    - Exam provision report (Provisions)
    - Venue availability file (Venue)
    
    Then returns structured data for each.
    """

    filename = getattr(file, "name", "uploaded_file")

    # Attempt to load with pandas (works for exam + provision)
    try:
        df = load_pandas(file)
    except Exception:
        if hasattr(file, "seek"):
            file.seek(0)
        return parse_venue_file(file)

    # ------------------------------------------
    # 1. Detect PROVISION file
    # ------------------------------------------
    if detect_provision_file(df):
        file_type = "Provisions"

        missing = validate_required_columns(df, file_type)
        if missing:
            return {
                "status": "error",
                "file": filename,
                "type": file_type,
                "message": f"Missing required columns: {', '.join(missing)}"
            }

        return {
            "status": "ok",
            "type": "Provisions",
            "file": filename,
            "columns": list(df.columns),
            "rows": df.to_dict(orient="records"),
        }

    # ------------------------------------------
    # 2. Detect VENUE file
    # ------------------------------------------
    if detect_venue_file(df):
        if hasattr(file, "seek"):
            file.seek(0)
        return parse_venue_file(file)

    # ------------------------------------------
    # 3. Detect EXAM file
    # ------------------------------------------
    if detect_exam_file(df):
        file_type = "Exam"

        missing = validate_required_columns(df, file_type)
        if missing:
            return {
                "status": "error",
                "file": filename,
                "type": file_type,
                "message": f"Missing required columns: {', '.join(missing)}"
            }

        return {
            "status": "ok",
            "type": "Exam",
            "file": filename,
            "columns": list(df.columns),
            "rows": df.to_dict(orient="records"),
        }

    # ------------------------------------------
    # 4. Unknown file type
    # ------------------------------------------
    return {
        "status": "error",
        "file": filename,
        "message": "Unrecognized file structure. Cannot classify."
    }
