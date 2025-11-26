import re
from .equivalents import EQUIVALENT_COLUMNS

def normalize(col):
    """Normalize column names: lowercase, underscores, remove punctuation."""
    return re.sub(r'[^a-z0-9_]', '', col.strip().lower().replace(" ", "_"))

def map_equivalent_columns(columns):
    """Map messy Excel columns to standardized field names."""
    normalized_to_canonical = {}
    for canonical, equivalents in EQUIVALENT_COLUMNS.items():
        for eq in equivalents:
            normalized_to_canonical[normalize(eq)] = canonical

    mapping = {}
    for col in columns:
        norm = normalize(col)
        mapping[col] = normalized_to_canonical.get(norm, norm)
    return mapping
