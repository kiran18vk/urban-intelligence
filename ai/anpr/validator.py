"""
Normalization and validation for Indian vehicle registration plates (Phase 2B ANPR, SIH 2026 PS 26124).

Supported Indian formats:
  1. Standard State/UT Series:
     [2-letter State Code][1-2 digit District][1-3 letter Series][4-digit Number]
     Examples: MH12AB1234, DL1CAB5678, KA01MJ9999, AP28BW1122, TN09BZ4321
  2. Bharat (BH) Series:
     [2-digit Year]BH[4-digit Number][1-2 letter Series]
     Examples: 22BH1234AA, 23BH5678B
"""

import re
from typing import Tuple

# Standard 2-letter Indian State & Union Territory codes
INDIAN_STATE_CODES = {
    "AN", "AP", "AR", "AS", "BR", "CH", "CG", "DD", "DL", "DN",
    "GA", "GJ", "HP", "HR", "JH", "JK", "KA", "KL", "LA", "LD",
    "MH", "ML", "MN", "MP", "MZ", "NL", "OD", "PB", "PY", "RJ",
    "SK", "TN", "TR", "TS", "UK", "UP", "WB"
}

# Regex pattern for standard Indian plates:
# e.g., MH12AB1234, MH1A1234, KA01ABC1234
STANDARD_PLATE_REGEX = re.compile(
    r"^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{4})$"
)

# Regex pattern for Bharat (BH) series:
# e.g., 22BH1234AA, 23BH5678B
BH_PLATE_REGEX = re.compile(
    r"^([0-9]{2})(BH)([0-9]{4})([A-Z]{1,2})$"
)

# Mapping common OCR letter/digit confusions
DIGIT_TO_LETTER = {
    "0": "O",
    "1": "I",
    "2": "Z",
    "5": "S",
    "8": "B",
}

LETTER_TO_DIGIT = {
    "O": "0",
    "Q": "0",
    "D": "0",
    "I": "1",
    "L": "1",
    "Z": "2",
    "S": "5",
    "B": "8",
    "G": "6",
}


def normalize_plate_text(raw_text: str) -> str:
    """
    Normalizes raw OCR output by stripping whitespace, dashes, and special characters.
    Handles standard Indian HSRP 'IND' badge prefixes and performs careful contextual
    character substitution WITHOUT inventing or adding characters.
    """
    if not raw_text:
        return ""

    # Uppercase and remove all non-alphanumeric characters
    cleaned = re.sub(r"[^A-Za-z0-9]", "", raw_text).upper()
    if not cleaned:
        return ""

    # If it already matches valid regex, keep as-is
    if STANDARD_PLATE_REGEX.match(cleaned) or BH_PLATE_REGEX.match(cleaned):
        return cleaned

    # Strip leading 'IND' badge prefix if present from HSRP plates (e.g. INDMH12AB1234 -> MH12AB1234)
    if cleaned.startswith("IND") and len(cleaned) >= 12:
        without_ind = cleaned[3:]
        if STANDARD_PLATE_REGEX.match(without_ind) or BH_PLATE_REGEX.match(without_ind):
            return without_ind
        cleaned = without_ind

    # Contextual substitution for Bharat (BH) Series (e.g. 22BH1234AA: 2 digits, BH, 4 digits, 1-2 letters)
    n = len(cleaned)
    if 9 <= n <= 10 and ("BH" in cleaned[2:4]):
        bh_chars = list(cleaned)
        # First 2 digits (Year)
        for i in (0, 1):
            if bh_chars[i] in LETTER_TO_DIGIT:
                bh_chars[i] = LETTER_TO_DIGIT[bh_chars[i]]
        # Next 2 letters must be 'BH'
        bh_chars[2] = 'B' if bh_chars[2] in ('8', 'B') else bh_chars[2]
        bh_chars[3] = 'H' if bh_chars[3] in ('H', '4') else bh_chars[3]
        # Middle 4 digits
        for i in range(4, 8):
            if bh_chars[i] in LETTER_TO_DIGIT:
                bh_chars[i] = LETTER_TO_DIGIT[bh_chars[i]]
        # Trailing 1-2 letters
        for i in range(8, n):
            if bh_chars[i] in DIGIT_TO_LETTER:
                bh_chars[i] = DIGIT_TO_LETTER[bh_chars[i]]
        bh_candidate = "".join(bh_chars)
        if BH_PLATE_REGEX.match(bh_candidate):
            return bh_candidate

    # Contextual substitution for standard plate pattern length (9 to 11 chars)
    # Target structure: [State: 2 letters][District: 1-2 digits][Series: 1-3 letters][Number: 4 digits]
    if 9 <= n <= 11:
        chars = list(cleaned)

        # 1. First 2 characters must be State letters
        for i in (0, 1):
            if chars[i] in DIGIT_TO_LETTER:
                chars[i] = DIGIT_TO_LETTER[chars[i]]

        # 2. Characters 2 and 3 should be District digits
        for i in (2, 3):
            if chars[i] in LETTER_TO_DIGIT:
                chars[i] = LETTER_TO_DIGIT[chars[i]]

        # 3. Last 4 characters must be registration number digits
        for i in range(n - 4, n):
            if chars[i] in LETTER_TO_DIGIT:
                chars[i] = LETTER_TO_DIGIT[chars[i]]

        # 4. Middle characters (between district and last 4 digits) should be letters
        for i in range(4, n - 4):
            if chars[i] in DIGIT_TO_LETTER:
                chars[i] = DIGIT_TO_LETTER[chars[i]]

        candidate = "".join(chars)
        if STANDARD_PLATE_REGEX.match(candidate):
            return candidate

    return cleaned


def validate_indian_registration(text: str) -> Tuple[bool, str]:
    """
    Validates whether the normalized text matches an Indian vehicle registration schema.

    Returns:
        (is_valid: bool, format_type: str)
        format_type is 'standard', 'bharat_series', or 'invalid'.
    """
    if not text:
        return False, "invalid"

    # 1. Standard State/UT check
    std_match = STANDARD_PLATE_REGEX.match(text)
    if std_match:
        state_code = std_match.group(1)
        # Verify valid State/UT abbreviation or allow generic 2-letter Indian code
        if state_code in INDIAN_STATE_CODES or state_code.isalpha():
            return True, "standard"

    # 2. Bharat (BH) Series check
    bh_match = BH_PLATE_REGEX.match(text)
    if bh_match:
        return True, "bharat_series"

    return False, "invalid"


def evaluate_plate_status(
    raw_text: str,
    normalized_text: str,
    confidence: float,
    confidence_threshold: float,
) -> str:
    """
    Determines status: 'verified', 'low_confidence', or 'not_detected'.

    NOTE:
      A status of 'verified' means the plate satisfies the Indian syntactic format
      AND meets the OCR confidence threshold. It is an OCR confidence result,
      NOT an official external ground-truth verification (e.g., VAHAN DB lookup).
      A syntactically valid registration is NOT automatically a correct recognition.

    Rules:
      - If no readable text or empty -> 'not_detected'
      - If valid Indian registration AND confidence >= threshold -> 'verified'
      - If text exists but format is invalid OR confidence < threshold -> 'low_confidence'
    """
    if not raw_text or not normalized_text:
        return "not_detected"

    is_valid, _ = validate_indian_registration(normalized_text)

    if is_valid and confidence >= confidence_threshold:
        return "verified"

    return "low_confidence"
