from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from rapidfuzz import fuzz

from app.schemas.jobs import CleanedJob, HierarchyNode, JobHierarchyItem, JobHierarchyResponse
from app.utils.config import settings
from app.utils.text import infer_education_level, normalize_text, split_messy_field, split_skills, unique_clean_list, canonical_key


class JobsService:
    def __init__(self, jobs_path: str) -> None:
        self.jobs_path = Path(jobs_path)
        self._jobs_cache: list[CleanedJob] | None = None
        self._job_detail_cache: dict[str, CleanedJob] = {}
        self._hierarchy_cache: JobHierarchyResponse | None = None
        self._data_source = "not_loaded"
        self._cache_status = "cold"

    def _read_from_database(self) -> list[dict[str, Any]] | None:
        if not settings.database_url:
            return None

        import psycopg
        from psycopg import sql

        with psycopg.connect(settings.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    sql.SQL("select payload from {} order by job_id").format(sql.Identifier(settings.jobs_table))
                )
                rows = cursor.fetchall()

        jobs = [row[0] for row in rows if isinstance(row[0], dict)]
        if not jobs:
            raise ValueError("No jobs were found in the configured Neon database.")
        self._data_source = "neon"
        return jobs

    def _read_index_from_database(self) -> list[dict[str, Any]] | None:
        if not settings.database_url:
            return None

        import psycopg
        from psycopg import sql

        table = sql.Identifier(settings.jobs_table)
        with psycopg.connect(settings.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    sql.SQL(
                        """
                        select
                          payload->>'job_id' as job_id,
                          payload->>'job_title' as job_title,
                          payload->>'minimum_education' as minimum_education,
                          payload->>'main_group' as main_group,
                          payload->>'main_group_id' as main_group_id,
                          payload->>'sub_group' as sub_group,
                          payload->>'sub_group_id' as sub_group_id,
                          payload->>'secondary_group' as secondary_group,
                          payload->>'secondary_group_id' as secondary_group_id,
                          payload->>'unit' as unit,
                          payload->>'unit_id' as unit_id
                        from {}
                        order by job_id
                        """
                    ).format(table)
                )
                columns = [desc[0] for desc in cursor.description]
                rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        if not rows:
            raise ValueError("No jobs were found in the configured Neon database.")
        self._data_source = "neon"
        return rows

    def _read_job_from_database(self, job_id: str) -> dict[str, Any] | None:
        if not settings.database_url:
            return None

        import psycopg
        from psycopg import sql

        with psycopg.connect(settings.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    sql.SQL("select payload from {} where job_id = %s limit 1").format(sql.Identifier(settings.jobs_table)),
                    (job_id,),
                )
                row = cursor.fetchone()

        if not row or not isinstance(row[0], dict):
            return None
        self._data_source = "neon"
        return row[0]

    def _read_raw(self) -> list[dict[str, Any]]:
        database_jobs = self._read_from_database()
        if database_jobs is not None:
            return database_jobs

        if not self.jobs_path.exists():
            raise FileNotFoundError(
                f"Jobs file not found at {self.jobs_path}. Copy your actual jobs JSON to backend/data/jobs.json."
            )
        data = json.loads(self.jobs_path.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            raise ValueError("Jobs JSON must be a list of job objects.")
        self._data_source = "local_json"
        return data

    def _read_raw_index(self) -> list[dict[str, Any]]:
        database_jobs = self._read_index_from_database()
        if database_jobs is not None:
            return database_jobs

        return self._read_raw()

    def _clean_job(self, raw: dict[str, Any]) -> CleanedJob:
        technical_skills, soft_from_technical = split_skills(raw.get("technical_skills"))
        competency_items = split_messy_field(raw.get("competency_details"))
        competency_technical, competency_soft = split_skills(competency_items)
        technical_skills = unique_clean_list([*technical_skills, *competency_technical])
        soft_skills = unique_clean_list([*soft_from_technical, *competency_soft])

        return CleanedJob(
            job_id=normalize_text(str(raw.get("job_id", "")).strip()),
            job_title=normalize_text(str(raw.get("job_title", "")).strip()),
            main_group=normalize_text(str(raw.get("main_group", "")).strip()) or None,
            main_group_id=normalize_text(str(raw.get("main_group_id", "")).strip()) or None,
            sub_group=normalize_text(str(raw.get("sub_group", "")).strip()) or None,
            sub_group_id=normalize_text(str(raw.get("sub_group_id", "")).strip()) or None,
            secondary_group=normalize_text(str(raw.get("secondary_group", "")).strip()) or None,
            secondary_group_id=normalize_text(str(raw.get("secondary_group_id", "")).strip()) or None,
            unit=normalize_text(str(raw.get("unit", "")).strip()) or None,
            unit_id=normalize_text(str(raw.get("unit_id", "")).strip()) or None,
            summary=normalize_text(str(raw.get("summary", "")).strip()) or None,
            main_tasks=split_messy_field(raw.get("main_tasks")),
            entry_level=normalize_text(str(raw.get("entry_level", "")).strip()) or None,
            minimum_education=infer_education_level(raw.get("minimum_education")) or "Unspecified / Inferred",
            specific_education=split_messy_field(raw.get("specific_education")),
            related_experience=normalize_text(str(raw.get("related_experience", "")).strip()) or None,
            technical_skills=technical_skills,
            soft_skills=soft_skills,
            standard_job_levels=split_messy_field(raw.get("standard_job_levels")),
            competency_details=competency_items,
        )

    def load_jobs(self) -> list[CleanedJob]:
        if self._jobs_cache is not None:
            self._cache_status = "hit"
            return self._jobs_cache

        self._cache_status = "miss"
        raw_jobs = self._read_raw()
        cleaned: list[CleanedJob] = []
        seen: set[str] = set()
        for raw in raw_jobs:
            job = self._clean_job(raw)
            if not job.job_id and not job.job_title:
                continue
            key = f"{job.job_id}|{canonical_key(job.job_title)}"
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(job)
        cleaned.sort(key=lambda x: (x.minimum_education or "", x.main_group or "", x.unit or "", x.job_title))
        self._jobs_cache = cleaned
        return cleaned

    def build_hierarchy(self) -> JobHierarchyResponse:
        if self._hierarchy_cache is not None:
            self._cache_status = "hit"
            return self._hierarchy_cache

        jobs = self._load_jobs_index()
        bucket: dict[tuple[str, str, str, str], list[CleanedJob]] = {}
        for job in jobs:
            specialization = job.secondary_group or job.sub_group or "Other Specializations"
            key = (
                job.minimum_education or "Unspecified / Inferred",
                job.main_group or "Other Domains",
                specialization,
                job.unit or "Other Units",
            )
            bucket.setdefault(key, []).append(job)

        items = [
            JobHierarchyItem(
                minimum_education=key[0],
                main_group=key[1],
                specialization=key[2],
                unit=key[3],
                jobs=sorted(value, key=lambda x: x.job_title),
            )
            for key, value in bucket.items()
        ]
        items.sort(key=lambda x: (x.minimum_education, x.main_group, x.specialization, x.unit))

        education_options = [HierarchyNode(label=edu, value=edu) for edu in sorted({item.minimum_education for item in items})]
        main_group_options = [HierarchyNode(label=mg, value=mg) for mg in sorted({item.main_group for item in items})]
        response = JobHierarchyResponse(
            items=items,
            total_jobs=len(jobs),
            education_options=education_options,
            main_group_options=main_group_options,
            data_source=self._data_source,
            cache_status=self._cache_status,
        )
        self._hierarchy_cache = response
        return response

    def _load_jobs_index(self) -> list[CleanedJob]:
        if self._jobs_cache is not None:
            self._cache_status = "hit"
            return self._jobs_cache

        self._cache_status = "miss"
        raw_jobs = self._read_raw_index()
        cleaned: list[CleanedJob] = []
        seen: set[str] = set()
        for raw in raw_jobs:
            job = self._clean_job(raw)
            if not job.job_id and not job.job_title:
                continue
            key = f"{job.job_id}|{canonical_key(job.job_title)}"
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(job)
        cleaned.sort(key=lambda x: (x.minimum_education or "", x.main_group or "", x.unit or "", x.job_title))
        self._jobs_cache = cleaned
        return cleaned

    def get_job(self, job_id: str) -> CleanedJob:
        if job_id in self._job_detail_cache:
            return self._job_detail_cache[job_id]

        database_job = self._read_job_from_database(job_id)
        if database_job is not None:
            job = self._clean_job(database_job)
            self._job_detail_cache[job_id] = job
            return job

        for raw in self._read_raw():
            job = self._clean_job(raw)
            if job.job_id == job_id:
                self._job_detail_cache[job_id] = job
                return job
        raise KeyError(f"Job {job_id} was not found.")

    def source_info(self) -> dict[str, Any]:
        jobs = self.load_jobs()
        return {
            "data_source": self._data_source,
            "database_configured": bool(settings.database_url),
            "jobs_table": settings.jobs_table if settings.database_url else None,
            "total_jobs": len(jobs),
            "cache_status": self._cache_status,
        }

    def clear_cache(self) -> None:
        self._jobs_cache = None
        self._job_detail_cache = {}
        self._hierarchy_cache = None
        self._cache_status = "cleared"

    def search(self, query: str, limit: int = 20) -> list[CleanedJob]:
        query_norm = canonical_key(query)
        jobs = self.load_jobs()
        scored: list[tuple[int, CleanedJob]] = []
        for job in jobs:
            haystack = " ".join(
                [
                    job.job_id,
                    job.job_title,
                    job.main_group or "",
                    job.sub_group or "",
                    job.secondary_group or "",
                    job.unit or "",
                    *(job.specific_education or []),
                    *(job.technical_skills or []),
                ]
            )
            score = fuzz.WRatio(query_norm, canonical_key(haystack))
            if query_norm in canonical_key(haystack):
                score += 15
            if score >= 50:
                scored.append((score, job))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [job for _, job in scored[:limit]]


@lru_cache(maxsize=1)
def get_jobs_service() -> JobsService:
    return JobsService(settings.jobs_file)
