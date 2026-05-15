from __future__ import annotations

import json
import re
from fastapi import HTTPException

from app.schemas.match import MatchResult
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
            raise ValueError(f"OpenAI did not return valid JSON:\n{cleaned[:1000]}")
        return json.loads(match.group(0))


class MatchService:
    def match(self, course_profile, job) -> MatchResult:
        client = get_openai_client()

        prompt = f"""
You are an expert evaluator of alignment between university courses and job profiles.

Return ONLY valid JSON. No markdown.

Schema:
{{
  "alignment_score": 0,
  "final_verdict": "",
  "academic_alignment": 0,
  "skill_alignment": 0,
  "task_alignment": 0,
  "practical_readiness": 0,
  "tool_alignment": 0,
  "domain_relevance": 0,
  "matched_skills": [],
  "missing_skills": [],
  "matched_tasks": [],
  "uncovered_job_responsibilities": [],
  "practical_readiness_assessment": "",
  "recommendations_to_improve_course": []
}}

Rules:
- Degree mismatch must NOT heavily penalize the score.
- Missing degree information is optional/inferred.
- Evaluate fairly using theory, skills, tasks, tools, and practical readiness.
- Use real reasoning, not keyword matching.

COURSE:
{course_profile.model_dump_json()}

JOB:
{json.dumps(job.model_dump(), ensure_ascii=False)}
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

            result = {
                "final_verdict": data.get("final_verdict", ""),
                "executive_summary": data.get("final_verdict", ""),
                "alignment_score": data.get("alignment_score", 0),
                "axis_scores": [
                    {
                        "name": "academic_alignment",
                        "score": data.get("academic_alignment", 0),
                        "rationale": "Academic alignment score",
                    },
                    {
                        "name": "skill_alignment",
                        "score": data.get("skill_alignment", 0),
                        "rationale": "Skill alignment score",
                    },
                    {
                        "name": "task_alignment",
                        "score": data.get("task_alignment", 0),
                        "rationale": "Task alignment score",
                    },
                    {
                        "name": "practical_readiness",
                        "score": data.get("practical_readiness", 0),
                        "rationale": "Practical readiness score",
                    },
                    {
                        "name": "tool_alignment",
                        "score": data.get("tool_alignment", 0),
                        "rationale": "Tool alignment score",
                    },
                    {
                        "name": "domain_relevance",
                        "score": data.get("domain_relevance", 0),
                        "rationale": "Domain relevance score",
                    },
                ],
                "matched_skills": data.get("matched_skills", []),
                "missing_skills": data.get("missing_skills", []),
                "matched_tasks": data.get("matched_tasks", []),
                "uncovered_job_responsibilities": data.get("uncovered_job_responsibilities", []),
                "practical_readiness_assessment": data.get("practical_readiness_assessment", ""),
                "degree_requirement_assessment": "Degree requirement was treated as optional/inferred and was not heavily penalized.",
                "inferred_degree_handling_note": "If the course does not explicitly mention degree level, this absence is treated as undocumented evidence rather than a negative judgment.",
                "recommendations_to_improve_course": data.get("recommendations_to_improve_course", []),
            }

            return MatchResult(**result)

        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate match result: {exc}",
            ) from exc
