from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.course import CourseProfile
from app.schemas.jobs import CleanedJob


class AxisScore(BaseModel):
    name: str
    score: int = Field(ge=0, le=100)
    rationale: str


class MatchResult(BaseModel):
    alignment_score: int = Field(ge=0, le=100)
    final_verdict: str
    executive_summary: str
    axis_scores: list[AxisScore]
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    matched_tasks: list[str] = Field(default_factory=list)
    uncovered_job_responsibilities: list[str] = Field(default_factory=list)
    practical_readiness_assessment: str
    recommendations_to_improve_course: list[str] = Field(default_factory=list)
    degree_requirement_assessment: str
    inferred_degree_handling_note: str


class MatchRequest(BaseModel):
    course_profile: CourseProfile
    selected_job: CleanedJob
    academic_context: dict[str, Any] | None = None
    language: Literal["en", "ar"] = "en"


class MatchResponse(BaseModel):
    course_profile: CourseProfile
    selected_job: CleanedJob
    result: MatchResult
    academic_context: dict[str, Any] | None = None
    language: Literal["en", "ar"] = "en"
