from __future__ import annotations

from pydantic import BaseModel, Field


class CourseProfile(BaseModel):
    course_title: str | None = None
    course_code: str | None = None
    program: str | None = None
    institution: str | None = None
    course_description: str | None = None
    course_main_objectives: list[str] = Field(default_factory=list)
    clos: list[str] = Field(default_factory=list, alias="CLOs")
    theoretical_topics: list[str] = Field(default_factory=list)
    lab_topics: list[str] = Field(default_factory=list)
    tools_software: list[str] = Field(default_factory=list)
    practical_components: list[str] = Field(default_factory=list)
    derived_employability_skills: list[str] = Field(default_factory=list)
    extraction_notes: list[str] = Field(default_factory=list)
    raw_text_excerpt: str | None = None

    model_config = {
        "populate_by_name": True,
    }


class CourseParseResponse(BaseModel):
    profile: CourseProfile
    pages: int
    extracted_characters: int
