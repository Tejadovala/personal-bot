"""
checker.py  (v4 — semantic field-type matching + spatial block filtering)
-------------------------------------------------------------------------
The three big fixes:

1. SEMANTIC FIELD-TYPE FILTERING
   Each XML field has a known type (email, phone, address, zip, date, name …).
   Before fuzzy-matching, we FILTER the OCR blocks to only those that
   look like the right type.  This stops:
     - RESADDRESS matching to customer-name/email text
     - SHIPPERNAME matching to "Bruce" alone (partial hit)
     - EMAILADDRESS matching to phone-number blocks

2. SPATIAL RECORD ISOLATION
   OCR blocks are sorted by Y position.  We find the block containing the
   RecordNo, then collect only the blocks in the same vertical band as that
   record (until the next RecordNo is found).  This is much more reliable
   than splitting the flat text string.

3. CONSERVATIVE RAPIDFUZZ MATCHING
   - No partial_ratio (too permissive)
   - Length penalty applied to all scores
   - Min threshold 0.65 (higher than before)
   - Returns ("", 0.0) when no confident match — shown as "not found"
     instead of a wrong cross-field match.
"""

from __future__ import annotations

import re
import difflib
from dataclasses import dataclass, field
from typing import List

from rapidfuzz import fuzz, process as rfprocess

from xml_parser import parse_xml, get_validatable_fields, get_record_no, get_remarks


# ── data classes ──────────────────────────────────────────────────────────────

@dataclass
class FieldResult:
    field_name:      str
    xml_value:       str
    ocr_value:       str
    missing_letters: List[str] = field(default_factory=list)
    missing_spaces:  List[int] = field(default_factory=list)
    missing_numbers: List[str] = field(default_factory=list)
    extra_chars:     List[str] = field(default_factory=list)
    issues:          List[str] = field(default_factory=list)
    match_score:     float = 0.0

    @property
    def has_issues(self) -> bool:
        return bool(self.missing_letters or self.missing_spaces
                    or self.missing_numbers or self.extra_chars)


@dataclass
class RecordResult:
    record_no:     str
    remarks:       str
    field_results: List[FieldResult] = field(default_factory=list)

    @property
    def fields_with_issues(self) -> List[FieldResult]:
        return [f for f in self.field_results if f.has_issues]

    @property
    def total_issues(self) -> int:
        return len(self.fields_with_issues)

    @property
    def is_clean(self) -> bool:
        return self.total_issues == 0


# ── Semantic field-type definitions ──────────────────────────────────────────
#
# Maps XML field names → their semantic "type" hint.
# These control which OCR blocks are searched first.

_EMAIL_WORDS  = {"hotmail", "gmail", "yahoo", "outlook", "mail", "com", "org", "net"}
_STREET_WORDS = {"rd", "st", "ave", "blvd", "box", "po", "dr", "ln", "road",
                 "drive", "street", "avenue", "place", "court", "hwy", "pob"}
_BLOOD_GROUPS = {"a+", "a-", "b+", "b-", "ab+", "ab-", "o+", "o-"}

FIELD_TYPES: dict[str, str] = {
    # identity
    "CustomerName":  "name",
    "BillingName":   "name",
    "ShipperName":   "name",
    "Name_P_Holder": "name",
    "STM_NAME":      "name",
    # contact
    "EmailAddress":  "email",
    "PhNo_1":        "phone",
    "PhNo_2":        "phone",
    # address
    "ResAddress":    "address",
    "City_1":        "city",
    "City_2":        "city",
    "State_1":       "state",
    "State_2":       "state",
    "Zip_1":         "zip",
    "Zip_2":         "zip",
    "Country_1":     "country",
    "Country_2":     "country",
    # demographics
    "Sex_1":         "gender",
    "D_Birth":       "date",
    "Height":        "number",
    "Weight":        "number",
    "Blood_Group":   "blood",
    # policy / codes
    "PloicyNo":      "code",
    "STM_CODE":      "code",
    "RecordNo":      "number",
    # yes/no
    "Alcoholic":     "yesno",
    "Smoker":        "yesno",
    "PastSug":       "yesno",
    "Diabetic":      "yesno",
    "Allergiesd":    "yesno",
}

_YESNO = {"yes", "no", "y", "n"}
_GENDER = {"male", "female", "m", "f"}
_COUNTRIES = {"us", "usa", "uk", "ca", "canada", "united states", "au"}
_STATES = {
    "al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in",
    "ia","ks","ky","la","me","md","ma","mi","mn","ms","mo","mt","ne","nv",
    "nh","nj","nm","ny","nc","nd","oh","ok","or","pa","ri","sc","sd","tn",
    "tx","ut","vt","va","wa","wv","wi","wy","ga",
}


def _block_score_for_type(block_text: str, field_type: str) -> float:
    """
    Return a 0.0–2.0 multiplier for how well a block matches a semantic type.
    2.0 = perfect match for type, 1.0 = neutral, 0.2 = likely wrong type.
    """
    t = block_text.strip().lower()
    words = set(t.split())

    if field_type == "email":
        if "@" in t: return 2.0
        if words & _EMAIL_WORDS: return 1.5
        return 0.2  # definitely not email

    if field_type == "phone":
        digits = sum(c.isdigit() for c in t)
        if digits >= 7: return 2.0
        if digits >= 4: return 1.2
        return 0.2

    if field_type == "address":
        if words & _STREET_WORDS: return 2.0
        # Has digits (street number) and alphabetic content
        if any(c.isdigit() for c in t) and any(c.isalpha() for c in t):
            return 1.4
        return 0.6

    if field_type == "zip":
        stripped = t.strip()
        if stripped.isdigit() and 4 <= len(stripped) <= 6: return 2.0
        if re.search(r'\b\d{4,6}\b', t): return 1.5
        return 0.2

    if field_type == "city":
        # Cities: mostly alphabetic, no @
        if "@" in t: return 0.2
        digits = sum(c.isdigit() for c in t)
        alphas = sum(c.isalpha() for c in t)
        if digits > alphas: return 0.2
        if all(c.isalpha() or c.isspace() for c in t): return 1.8
        return 1.0

    if field_type == "state":
        if t in _STATES: return 2.0
        if len(t) == 2 and t.isalpha(): return 1.8
        return 0.5

    if field_type == "country":
        if t in _COUNTRIES: return 2.0
        if len(t) <= 4 and t.isalpha(): return 1.4
        return 0.6

    if field_type == "date":
        if re.search(r'\d{1,2}/\d{1,2}/\d{2,4}', t): return 2.0
        if re.search(r'\d{4}', t): return 1.3
        return 0.4

    if field_type == "number":
        if t.isdigit(): return 2.0
        if any(c.isdigit() for c in t): return 1.3
        return 0.3

    if field_type == "blood":
        if t.lower() in _BLOOD_GROUPS: return 2.0
        if "+" in t or "-" in t: return 1.5
        return 0.3

    if field_type == "gender":
        if t in _GENDER: return 2.0
        return 0.3

    if field_type == "yesno":
        if t in _YESNO: return 2.0
        return 0.3

    if field_type == "code":
        # Mix of letters and digits, no spaces usually
        if re.search(r'[A-Za-z].*\d|\d.*[A-Za-z]', t): return 1.8
        return 0.8

    if field_type == "name":
        # Names: mostly alphabetic, no @, no street words
        if "@" in t: return 0.1
        if words & _STREET_WORDS: return 0.3
        digits = sum(c.isdigit() for c in t)
        alphas = sum(c.isalpha() for c in t)
        if digits > alphas: return 0.3
        if all(c.isalpha() or c.isspace() or c in "-.'" for c in t): return 1.8
        return 1.0

    return 1.0  # "text" / unknown — neutral



# ── Spatial record isolation ──────────────────────────────────────────────────

_REC_NO_PAT = re.compile(r"\b(\d{5,7})\b")


def _isolate_record_blocks(record_no: str,
                            next_record_no: str | None,
                            all_blocks: list[dict],
                            all_rec_nos: set[str]) -> list[dict]:
    """
    Find blocks belonging to this record by Y-coordinate banding.

    Strategy:
    1. Find any block whose text contains the record number.
    2. That block's Y-centre is the 'anchor'.
    3. Find the bottom boundary Y:
       - If next_record_no is in blocks, use its Y.
       - Otherwise, find the next block matching any valid record number from XML.
    4. Collect ALL blocks from anchor_y - 15 to next_rec_y - 5.
    """
    # Find anchor block
    anchor_y: int | None = None
    for blk in all_blocks:
        if record_no in blk["text"]:
            anchor_y = blk["cy"]
            break

    if anchor_y is None:
        # Try regex — record number might be split across tokens
        for blk in all_blocks:
            m = _REC_NO_PAT.search(blk["text"])
            if m and m.group(1) == record_no:
                anchor_y = blk["cy"]
                break

    if anchor_y is None:
        return all_blocks  # fallback: use everything

    # Find next record-number block's Y to set the bottom boundary
    next_rec_y: int = 999_999
    
    # 1st try: look for the specific next_record_no
    if next_record_no:
        for blk in all_blocks:
            if blk["cy"] > anchor_y + 10:
                if next_record_no in blk["text"]:
                    next_rec_y = blk["cy"]
                    break

    # 2nd try fallback: if not found, scan for any valid record number from XML
    if next_rec_y == 999_999:
        for blk in sorted(all_blocks, key=lambda b: b["cy"]):
            if blk["cy"] > anchor_y + 10:
                m = _REC_NO_PAT.search(blk["text"])
                if m and m.group(1) in all_rec_nos and m.group(1) != record_no:
                    next_rec_y = blk["cy"]
                    break

    # Collect blocks between anchor and next record, with exact padding to split rows cleanly
    top    = anchor_y - 15
    bottom = next_rec_y - 5

    record_blocks = [b for b in all_blocks if top <= b["cy"] <= bottom]
    return record_blocks if record_blocks else all_blocks



# ── rapidfuzz matching (conservative) ────────────────────────────────────────

def _rf_score_conservative(query: str, candidate: str) -> float:
    """
    Average of WRatio (good for spelling/typos) and Levenshtein ratio (strict sequence similarity).
    Applies a linear word-count length penalty.
    """
    if not query or not candidate:
        return 0.0
    q = query.lower().strip()
    c = candidate.lower().strip()

    wratio = fuzz.WRatio(q, c) / 100.0
    ratio = fuzz.ratio(q, c) / 100.0
    base = 0.5 * wratio + 0.5 * ratio

    # Linear word-count length penalty
    qw = len(query.split())
    cw = len(candidate.split())
    if qw > 0 and cw > 0:
        lratio = min(qw, cw) / max(qw, cw)
        base = base * (0.65 + 0.35 * lratio)

    return base



def _find_best_match(xml_value: str,
                     record_blocks: list[dict],
                     field_name: str,
                     fallback_text: str) -> tuple[str, float]:
    """
    Block-first matching — avoids cross-block contamination.

    Strategy:
      1. Score each individual OCR block (semantic type + fuzzy match).
      2. If no single block scores ≥0.65, try same-row adjacent block pairs.
      3. If still nothing, try all semantic-matching blocks joined, with
         a higher threshold (0.72) to avoid false positives.
      4. Return ("", 0.0) if no confident match found.
    """
    field_type = FIELD_TYPES.get(field_name, "text")
    if not xml_value or not record_blocks:
        return "", 0.0

    # ── Step 1: Score individual blocks ──────────────────────────────────────
    best_text, best_score = "", 0.0

    for blk in record_blocks:
        t = blk["text"].strip()
        if not t:
            continue
        type_mult = _block_score_for_type(t, field_type)
        if type_mult < 0.4:
            continue  # definitively wrong type — skip

        raw = _rf_score_conservative(xml_value, t)
        # Boost score for blocks that look like the right type
        boosted = raw * min(type_mult, 1.3)

        if boosted > best_score:
            best_score = boosted
            best_text  = t

    if best_score >= 0.65:
        return best_text, min(best_score, 1.0)

    # ── Step 2: Try adjacent same-row block pairs ────────────────────────────
    # Only combine blocks that are on the same horizontal row (±1.5 block heights)
    sorted_blks = sorted(record_blocks, key=lambda b: (b["y"], b["x"]))

    for i in range(len(sorted_blks) - 1):
        b1, b2 = sorted_blks[i], sorted_blks[i + 1]
        t1, t2 = b1["text"].strip(), b2["text"].strip()
        if not t1 or not t2:
            continue

        # Allow blocks within 1.5× their average height to be on the "same row"
        row_gap = abs(b1["cy"] - b2["cy"])
        avg_h   = (b1["h"] + b2["h"]) / 2 if (b1["h"] + b2["h"]) > 0 else 20
        if row_gap > avg_h * 1.5:
            continue

        # Both blocks should be plausible for this field type
        t1_score = _block_score_for_type(t1, field_type)
        t2_score = _block_score_for_type(t2, field_type)
        if min(t1_score, t2_score) < 0.35:
            continue

        combined = t1 + " " + t2
        raw      = _rf_score_conservative(xml_value, combined)
        boosted  = raw * min((t1_score + t2_score) / 2, 1.3)

        if boosted > best_score:
            best_score = boosted
            best_text  = combined

    if best_score >= 0.65:
        return best_text, min(best_score, 1.0)

    # ── Step 3: Try 3-block same-row combination ──────────────────────────────
    for i in range(len(sorted_blks) - 2):
        b1, b2, b3 = sorted_blks[i], sorted_blks[i+1], sorted_blks[i+2]
        texts = [b["text"].strip() for b in (b1, b2, b3)]
        if not all(texts):
            continue

        # All three must be within 1.5× average block height in Y
        ys = [b["cy"] for b in (b1, b2, b3)]
        avg_h = sum(b["h"] for b in (b1, b2, b3)) / 3 if any(b["h"] for b in (b1, b2, b3)) else 20
        if max(ys) - min(ys) > avg_h * 1.5:
            continue

        type_scores = [_block_score_for_type(t, field_type) for t in texts]
        if min(type_scores) < 0.35:
            continue

        combined = " ".join(texts)
        raw      = _rf_score_conservative(xml_value, combined)
        boosted  = raw * min(sum(type_scores) / 3, 1.2)

        if boosted > best_score:
            best_score = boosted
            best_text  = combined

    if best_score >= 0.65:
        return best_text, min(best_score, 1.0)

    # ── Step 4: Fallback — best individual block without type filter ──────────
    # Use plain fuzzy on each block, strict 0.70 threshold
    for blk in record_blocks:
        t = blk["text"].strip()
        if not t:
            continue
        raw = _rf_score_conservative(xml_value, t)
        if raw > best_score:
            best_score = raw
            best_text  = t

    if best_score >= 0.70:
        return best_text, min(best_score, 1.0)

    # Nothing confident found
    return "", 0.0



# ── character-level diff ──────────────────────────────────────────────────────

def _issue_label(xml_seg: str, ocr_seg: str, tag: str) -> str | None:
    has_alpha = any(c.isalpha()  for c in xml_seg)
    has_digit = any(c.isdigit()  for c in xml_seg)
    has_space = " " in xml_seg
    ocr_alpha = any(c.isalpha()  for c in ocr_seg)
    ocr_digit = any(c.isdigit()  for c in ocr_seg)

    if tag == "replace":
        if xml_seg and ocr_seg:
            if len(xml_seg) == len(ocr_seg):
                if has_alpha and not has_digit:
                    return f'Letter swap — "{ocr_seg}" found, expected "{xml_seg}"'
                if has_digit and not has_alpha:
                    return f'Number swap — "{ocr_seg}" found, expected "{xml_seg}"'
                return f'Character swap — "{ocr_seg}" → "{xml_seg}"'
            parts = []
            if has_alpha: parts.append(f'missing letter(s) "{xml_seg}"')
            if has_digit: parts.append(f'missing number(s) "{xml_seg}"')
            if ocr_seg:   parts.append(f'extra "{ocr_seg}" found')
            return "; ".join(parts) if parts else None

    if tag == "delete":
        parts = []
        if has_alpha:
            letters = sorted({c for c in xml_seg if c.isalpha()})
            parts.append(f'Missing letter(s): {", ".join(letters)}')
        if has_space: parts.append("Missing space")
        if has_digit:
            digits = "".join(c for c in xml_seg if c.isdigit())
            parts.append(f'Missing number(s): {digits}')
        return " | ".join(parts) if parts else None

    if tag == "insert":
        parts = []
        if ocr_alpha:
            letters = sorted({c for c in ocr_seg if c.isalpha()})
            parts.append(f'Extra letter(s): {", ".join(letters)}')
        if ocr_digit:
            digits = "".join(c for c in ocr_seg if c.isdigit())
            parts.append(f'Extra number(s): {digits}')
        return " | ".join(parts) if parts else None

    return None


def _analyse_diff(xml_value: str, ocr_value: str, score: float) -> dict:
    missing_letters: set  = set()
    missing_spaces:  list = []
    missing_numbers: set  = set()
    extra_chars:     list = []
    issues:          list = []

    if not ocr_value or score < 0.30:
        for i, ch in enumerate(xml_value):
            if ch.isalpha():   missing_letters.add(ch)
            elif ch == " ":    missing_spaces.append(i)
            elif ch.isdigit(): missing_numbers.add(ch)
        if missing_letters: issues.append(f"Not found in image — missing: {', '.join(sorted(missing_letters))}")
        if missing_spaces:  issues.append(f"Not found — {len(missing_spaces)} space(s) expected")
        if missing_numbers: issues.append(f"Not found — numbers: {''.join(sorted(missing_numbers))}")
        return dict(missing_letters=sorted(missing_letters),
                    missing_spaces=missing_spaces,
                    missing_numbers=sorted(missing_numbers),
                    extra_chars=extra_chars, issues=issues)

    matcher = difflib.SequenceMatcher(None, xml_value, ocr_value)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal": continue
        xml_seg = xml_value[i1:i2]
        ocr_seg = ocr_value[j1:j2]

        if tag in ("delete", "replace"):
            for ch in xml_seg:
                if ch.isalpha():   missing_letters.add(ch)
                elif ch == " ":    missing_spaces.append(i1)
                elif ch.isdigit(): missing_numbers.add(ch)

        if tag in ("insert", "replace"):
            extra_chars.extend(list(ocr_seg))

        label = _issue_label(xml_seg, ocr_seg, tag)
        if label: issues.append(label)

    return dict(missing_letters=sorted(missing_letters),
                missing_spaces=missing_spaces,
                missing_numbers=sorted(missing_numbers),
                extra_chars=extra_chars, issues=issues)


# ── public API ────────────────────────────────────────────────────────────────

def validate_record(record: dict,
                    record_blocks: list[dict],
                    fallback_text: str) -> RecordResult:
    record_no = get_record_no(record)
    remarks   = get_remarks(record)
    fields    = get_validatable_fields(record)

    field_results: list[FieldResult] = []

    for field_name, xml_value in fields.items():
        ocr_match, score = _find_best_match(
            xml_value, record_blocks, field_name, fallback_text
        )
        diff = _analyse_diff(xml_value, ocr_match, score)
        field_results.append(FieldResult(
            field_name      = field_name,
            xml_value       = xml_value,
            ocr_value       = ocr_match,
            missing_letters = diff["missing_letters"],
            missing_spaces  = diff["missing_spaces"],
            missing_numbers = diff["missing_numbers"],
            extra_chars     = diff["extra_chars"],
            issues          = diff["issues"],
            match_score     = round(score, 3),
        ))

    return RecordResult(record_no=record_no, remarks=remarks,
                        field_results=field_results)


def validate_all(xml_path: str,
                 ocr_text: str,
                 blocks: list[dict] | None = None) -> list[RecordResult]:
    """
    Validate each XML record against its spatially-isolated OCR block list.
    """
    records    = parse_xml(xml_path)
    all_blocks = blocks or []

    # Parse all record numbers to pass to block isolation
    rec_nos = [get_record_no(r) for r in records]
    all_rec_nos = set(rec_nos)

    results = []
    for idx, rec in enumerate(records):
        rec_no = get_record_no(rec)
        next_rec_no = rec_nos[idx + 1] if idx + 1 < len(rec_nos) else None

        if all_blocks:
            record_blocks = _isolate_record_blocks(rec_no, next_rec_no, all_blocks, all_rec_nos)
            # Build a clean flat text from this record's blocks only
            fallback = " ".join(b["text"] for b in record_blocks)
        else:
            record_blocks = []
            fallback = ocr_text

        results.append(validate_record(rec, record_blocks, fallback))

    return results

