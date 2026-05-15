from __future__ import annotations

import re
from typing import Iterable

ARABIC_DIACRITICS_RE = re.compile(r"[\u064B-\u065F\u0670\u06D6-\u06ED]")
MULTISPACE_RE = re.compile(r"\s+")
BULLET_RE = re.compile(r"^[\-•●▪◦■□\*\d\)\(\.\s]+")
NOISE_TOKENS = {
    "n/a",
    "na",
    "none",
    "null",
    "-",
    "--",
    "غير متاح",
    "لا يوجد",
    "غير محدد",
    "nan",
}

SOFT_SKILL_HINTS = {
    "communication",
    "teamwork",
    "leadership",
    "problem solving",
    "time management",
    "attention to detail",
    "critical thinking",
    "presentation",
    "collaboration",
    "adaptability",
    "analytical thinking",
    "حل المشكلات",
    "التواصل",
    "العمل الجماعي",
    "القيادة",
    "إدارة الوقت",
    "التفكير النقدي",
    "المرونة",
    "التحليل",
}

EDUCATION_CANONICAL = {
    "high school": "High School",
    "diploma": "Diploma",
    "associate": "Associate",
    "bachelor": "Bachelor",
    "bachelors": "Bachelor",
    "b.sc": "Bachelor",
    "bs": "Bachelor",
    "ba": "Bachelor",
    "master": "Master",
    "masters": "Master",
    "m.sc": "Master",
    "msc": "Master",
    "phd": "PhD",
    "doctorate": "PhD",
    "ثانوي": "High School",
    "دبلوم": "Diploma",
    "بكالوريوس": "Bachelor",
    "ماجستير": "Master",
    "دكتوراه": "PhD",
}


def normalize_whitespace(text: str) -> str:
    return MULTISPACE_RE.sub(" ", text or "").strip()



def normalize_arabic(text: str) -> str:
    if not text:
        return ""
    text = ARABIC_DIACRITICS_RE.sub("", text)
    replacements = {
        "أ": "ا",
        "إ": "ا",
        "آ": "ا",
        "ى": "ي",
        "ة": "ه",
        "ؤ": "و",
        "ئ": "ي",
        "ـ": "",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return text



def normalize_text(text: str) -> str:
    text = normalize_whitespace(text)
    text = text.replace("\u200f", " ").replace("\u200e", " ")
    text = text.replace("\xa0", " ")
    text = normalize_whitespace(text)
    return text



def canonical_key(text: str) -> str:
    text = normalize_text(text).lower()
    text = normalize_arabic(text)
    text = re.sub(r"[^\w\s]", " ", text)
    return normalize_whitespace(text)



def split_messy_field(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        parts: list[str] = []
        for item in value:
            parts.extend(split_messy_field(item))
        return unique_clean_list(parts)
    text = normalize_text(str(value))
    if not text or canonical_key(text) in NOISE_TOKENS:
        return []
    raw_parts = re.split(r"[\n\r;,/|]+", text)
    parts = [clean_list_item(part) for part in raw_parts]
    return unique_clean_list(parts)



def clean_list_item(item: str) -> str:
    item = normalize_text(item)
    item = BULLET_RE.sub("", item).strip()
    item = re.sub(r"\s{2,}", " ", item)
    return item



def unique_clean_list(values: Iterable[str]) -> list[str]:
    output: list[str] = []
    seen: set[str] = set()
    for value in values:
        value = clean_list_item(value)
        key = canonical_key(value)
        if not value or key in NOISE_TOKENS or key in seen:
            continue
        seen.add(key)
        output.append(value)
    return output



def infer_education_level(value: object) -> str | None:
    if value is None:
        return None
    joined = " ".join(split_messy_field(value)) if not isinstance(value, str) else value
    key = canonical_key(joined)
    for candidate, normalized in EDUCATION_CANONICAL.items():
        if canonical_key(candidate) in key:
            return normalized
    return normalize_text(joined) or None



def split_skills(values: object) -> tuple[list[str], list[str]]:
    items = split_messy_field(values)
    technical: list[str] = []
    soft: list[str] = []
    for item in items:
        key = canonical_key(item)
        if any(hint in key for hint in {canonical_key(v) for v in SOFT_SKILL_HINTS}):
            soft.append(item)
        else:
            technical.append(item)
    return unique_clean_list(technical), unique_clean_list(soft)
