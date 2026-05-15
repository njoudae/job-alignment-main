from fastapi import APIRouter, HTTPException, Query

from app.schemas.jobs import CleanedJob, JobHierarchyResponse, JobSearchResponse
from app.services.jobs_service import get_jobs_service

router = APIRouter()


@router.get("/hierarchy", response_model=JobHierarchyResponse)
def get_jobs_hierarchy() -> JobHierarchyResponse:
    try:
        return get_jobs_service().build_hierarchy()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("")
def list_jobs(limit: int = Query(100, ge=1, le=1000)) -> dict:
    try:
        jobs = get_jobs_service().load_jobs()
        items = [
            {
                "job_id": job.job_id,
                "job_title": job.job_title,
                "minimum_education": job.minimum_education,
                "main_group": job.main_group,
                "unit": job.unit,
            }
            for job in jobs[:limit]
        ]
        return {"items": items, "total": len(jobs)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/source")
def get_jobs_source() -> dict:
    try:
        return get_jobs_service().source_info()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/cache/clear")
def clear_jobs_cache() -> dict:
    get_jobs_service().clear_cache()
    return {"status": "cleared"}


@router.get("/search", response_model=JobSearchResponse)
def search_jobs(q: str = Query(..., min_length=1), limit: int = Query(20, ge=1, le=50)) -> JobSearchResponse:
    try:
        items = get_jobs_service().search(q, limit)
        return JobSearchResponse(items=items, total=len(items))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/detail/{job_id}", response_model=CleanedJob)
def get_job_detail(job_id: str) -> CleanedJob:
    try:
        return get_jobs_service().get_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
