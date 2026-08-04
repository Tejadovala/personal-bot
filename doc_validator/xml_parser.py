"""
xml_parser.py
-------------
Parses the XML document into a list of DataM records.
Uses Python's built-in xml.etree.ElementTree — no extra dependencies needed.
Each record is returned as a plain Python dict for easy field access.
"""

import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict


# Fields treated as metadata — excluded from OCR validation
# RecordNo is the key/identifier — not validated against OCR (it's used for isolation)
METADATA_FIELDS = {
    "ImageName",
    "UserID",
    "CreateDate",
    "UpdateDate",
    "Remarks",
    "RecordNo",
}

# Field values treated as "not available" — skip validation
INVALID_PLACEHOLDERS = {"N.A", "N/A", "", " "}


def parse_xml(xml_path: str) -> List[Dict[str, str]]:
    """
    Parse a <doc> XML file containing <DataM> records.

    Args:
        xml_path: Path to the XML file.

    Returns:
        List of dicts, one per <DataM> element.
        Keys are XML tag names; values are stripped text content.
    """
    path = Path(xml_path)
    if not path.exists():
        raise FileNotFoundError(f"XML file not found: {xml_path}")

    try:
        tree = ET.parse(str(path))
    except ET.ParseError as exc:
        raise ValueError(f"Invalid XML syntax in '{xml_path}': {exc}") from exc

    root = tree.getroot()
    records: List[Dict[str, str]] = []

    for data_m in root.findall("DataM"):
        record: Dict[str, str] = {}
        for child in data_m:
            tag = child.tag
            text = (child.text or "").strip()
            record[tag] = text
        records.append(record)

    return records


def get_validatable_fields(record: Dict[str, str]) -> Dict[str, str]:
    """
    Return only the fields that should be validated against OCR output.
    Skips metadata fields and fields with placeholder / empty values.

    Args:
        record: A single DataM record dict.

    Returns:
        Filtered dict of field_name -> value for OCR comparison.
    """
    return {
        field: value
        for field, value in record.items()
        if field not in METADATA_FIELDS
        and value not in INVALID_PLACEHOLDERS
        and value.strip() != ""
    }


def get_image_name(record: Dict[str, str]) -> str:
    """Return the ImageName field from a record, or empty string if absent."""
    return record.get("ImageName", "")


def get_record_no(record: Dict[str, str]) -> str:
    """Return the RecordNo field from a record."""
    return record.get("RecordNo", "Unknown")


def get_remarks(record: Dict[str, str]) -> str:
    """Return the Remarks field from a record."""
    return record.get("Remarks", "")
