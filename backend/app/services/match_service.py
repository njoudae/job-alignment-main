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
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise ValueError(f"OpenAI did not return parseable JSON:\n{cleaned[:1000]}") from exc


def clamp_score(value, default: int = 0) -> int:
    try:
        score = int(round(float(value)))
    except (TypeError, ValueError):
        score = default
    return max(0, min(100, score))


def clean_list(value) -> list[str]:
    if not value:
        return []
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


def localized_static(language: str) -> dict[str, str]:
    if language == "ar":
        return {
            "degree": "تم التعامل مع متطلب الدرجة العلمية بوصفه سياقًا داعمًا وليس عاملًا عقابيًا حاسمًا في درجة المواءمة.",
            "inferred": "إذا لم يذكر توصيف المقرر المستوى العلمي صراحة، فإن ذلك يعد غيابًا في الأدلة الموثقة لا حكمًا سلبيًا على المقرر.",
            "axis_academic": "درجة مؤشرات المواءمة المعرفية.",
            "axis_skill": "درجة مواءمة المهارات.",
            "axis_task": "درجة مواءمة المسؤوليات والمهام.",
            "axis_practical": "درجة الجاهزية المهنية التطبيقية.",
            "axis_tool": "درجة مواءمة الأدوات والتقنيات.",
            "axis_domain": "درجة صلة المجال المهني.",
        }
    return {
        "degree": "Degree requirement was treated as optional/inferred and was not heavily penalized.",
        "inferred": "If the course does not explicitly mention degree level, this absence is treated as undocumented evidence rather than a negative judgment.",
        "axis_academic": "Academic alignment score.",
        "axis_skill": "Skill alignment score.",
        "axis_task": "Task alignment score.",
        "axis_practical": "Practical readiness score.",
        "axis_tool": "Tool alignment score.",
        "axis_domain": "Domain relevance score.",
    }


class MatchService:
    def match(self, course_profile, job, language: str = "en") -> MatchResult:
        client = get_openai_client()
        language = "ar" if language == "ar" else "en"
        static = localized_static(language)

        if language == "ar":
            language_rules = """
- اكتب جميع الحقول السردية والتوصيات باللغة العربية الأكاديمية المهنية.
- استخدم صياغة داعمة وغير قاسية.
- استخدم هذه المصطلحات عند ملاءمتها: مؤشرات المواءمة، مجالات التطوير، التحسينات المقترحة، الجاهزية المهنية، تحليل داعم للقرار، لا يُعد حكمًا أكاديميًا نهائيًا.
- يمكن أن تبقى أسماء المهارات أو الأدوات كما وردت في مصدرها إذا كان تعريبها يضعف الدقة.
"""
        else:
            language_rules = """
- Write all narrative fields and recommendations in professional academic English.
- Use supportive, non-harsh wording.
- Use these terms when appropriate: Alignment indicators, Development areas, Suggested enhancements, Career readiness, Decision-support analysis, Not a final academic judgment.
"""

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
- If evidence is missing, describe it as not documented in the uploaded evidence.
{language_rules}

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
                "final_verdict": str(data.get("final_verdict") or ""),
                "executive_summary": str(data.get("final_verdict") or ""),
                "alignment_score": clamp_score(data.get("alignment_score")),
                "axis_scores": [
                    {
                        "name": "academic_alignment",
                        "score": clamp_score(data.get("academic_alignment")),
                        "rationale": static["axis_academic"],
                    },
                    {
                        "name": "skill_alignment",
                        "score": clamp_score(data.get("skill_alignment")),
                        "rationale": static["axis_skill"],
                    },
                    {
                        "name": "task_alignment",
                        "score": clamp_score(data.get("task_alignment")),
                        "rationale": static["axis_task"],
                    },
                    {
                        "name": "practical_readiness",
                        "score": clamp_score(data.get("practical_readiness")),
                        "rationale": static["axis_practical"],
                    },
                    {
                        "name": "tool_alignment",
                        "score": clamp_score(data.get("tool_alignment")),
                        "rationale": static["axis_tool"],
                    },
                    {
                        "name": "domain_relevance",
                        "score": clamp_score(data.get("domain_relevance")),
                        "rationale": static["axis_domain"],
                    },
                ],
                "matched_skills": clean_list(data.get("matched_skills")),
                "missing_skills": clean_list(data.get("missing_skills")),
                "matched_tasks": clean_list(data.get("matched_tasks")),
                "uncovered_job_responsibilities": clean_list(data.get("uncovered_job_responsibilities")),
                "practical_readiness_assessment": str(data.get("practical_readiness_assessment") or ""),
                "degree_requirement_assessment": static["degree"],
                "inferred_degree_handling_note": static["inferred"],
                "recommendations_to_improve_course": clean_list(data.get("recommendations_to_improve_course")),
            }

            return MatchResult(**result)

        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate match result: {exc}",
            ) from exc
