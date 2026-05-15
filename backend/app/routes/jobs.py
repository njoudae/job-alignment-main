from fastapi import APIRouter, HTTPException, Query

from app.schemas.jobs import JobHierarchyResponse, JobSearchResponse
from app.services.jobs_service import get_jobs_service

router = APIRouter()


@router.get("/hierarchy", response_model=JobHierarchyResponse)
def get_jobs_hierarchy() -> JobHierarchyResponse:
    try:
        return get_jobs_service().build_hierarchy()
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
