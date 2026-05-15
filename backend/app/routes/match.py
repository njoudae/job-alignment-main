from fastapi import APIRouter, HTTPException

from app.schemas.match import MatchRequest, MatchResponse
from app.services.match_service import MatchService

router = APIRouter()
match_service = MatchService()


@router.post("/match", response_model=MatchResponse)
def match_course_to_job(payload: MatchRequest) -> MatchResponse:
    try:
        result = match_service.match(payload.course_profile, payload.selected_job)
        return MatchResponse(
            course_profile=payload.course_profile,
            selected_job=payload.selected_job,
            result=result,
            academic_context=payload.academic_context,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate match result: {exc}") from exc
