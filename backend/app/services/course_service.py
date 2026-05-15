from __future__ import annotations

import json
import re

from fastapi import HTTPException

from app.schemas.course import CourseParseResponse, CourseProfile
from app.utils.openai_client import get_openai_client
from app.utils.config import settings


def extract_json_object(text: str) -> dict:
    if not text or not text.strip():
        raise ValueError("OpenAI returned an empty response.")

    cleaned = text.strip()

    cleaned = re.sub(r"^```json", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"^```", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            raise ValueError(f"OpenAI did not return valid JSON. Response was: {cleaned[:500]}")
        return json.loads(match.group(0))


class CourseService:
    def parse_course_profile(self, raw_text: str, pages: int) -> CourseParseResponse:
        client = get_openai_client()
        excerpt = raw_text[:18000]

        prompt = f"""
You are extracting a structured university course specification profile from PDF text.

Return ONLY valid JSON. Do not write markdown. Do not wrap the answer in ```json.

Use exactly this schema:
{{
  "course_title": null,
  "course_code": null,
  "program": null,
  "institution": null,
  "course_description": null,
  "course_main_objectives": [],
  "CLOs": [],
  "theoretical_topics": [],
  "lab_topics": [],
  "tools_software": [],
  "practical_components": [],
  "derived_employability_skills": [],
  "extraction_notes": [],
  "raw_text_excerpt": null
}}

Rules:
- Do not invent missing facts.
- Use null for missing scalar fields.
- Use [] for missing arrays.
- derived_employability_skills must be inferred only from explicit course evidence.
- raw_text_excerpt should be no more than 700 characters.
- Preserve Arabic or English as found.

PDF text:
{excerpt}
"""

        try:
            response = client.responses.create(
                model=settings.openai_model,
                input=prompt,
                temperature=0,
            )

            payload = getattr(response, "output_text", None)

            if not payload:
                try:
                    payload = response.output[0].content[0].text
                except Exception:
                    payload = ""

            data = extract_json_object(payload)
            profile = CourseProfile.model_validate(data)

            return CourseParseResponse(
                profile=profile,
                pages=pages,
                extracted_characters=len(raw_text),
            )

        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to parse course PDF: {exc}",
            ) from exc
        
