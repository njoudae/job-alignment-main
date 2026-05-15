from __future__ import annotations

from pydantic import BaseModel, Field


class CleanedJob(BaseModel):
    job_id: str
    job_title: str
    main_group: str | None = None
    main_group_id: str | None = None
    sub_group: str | None = None
    sub_group_id: str | None = None
    secondary_group: str | None = None
    secondary_group_id: str | None = None
    unit: str | None = None
    unit_id: str | None = None
    summary: str | None = None
    main_tasks: list[str] = Field(default_factory=list)
    entry_level: str | None = None
    minimum_education: str | None = None
    specific_education: list[str] = Field(default_factory=list)
    related_experience: str | None = None
    technical_skills: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)
    standard_job_levels: list[str] = Field(default_factory=list)
    competency_details: list[str] = Field(default_factory=list)


class HierarchyNode(BaseModel):
    label: str
    value: str


class JobHierarchyItem(BaseModel):
    minimum_education: str
    main_group: str
    specialization: str
    unit: str
    jobs: list[CleanedJob]


class JobHierarchyResponse(BaseModel):
    items: list[JobHierarchyItem]
    total_jobs: int
    education_options: list[HierarchyNode]
    main_group_options: list[HierarchyNode]
    data_source: str | None = None
    cache_status: str | None = None


class JobSearchResponse(BaseModel):
    items: list[CleanedJob]
    total: int
