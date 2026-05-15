from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.jobs import router as jobs_router
from app.routes.course import router as course_router
from app.routes.match import router as match_router
from app.utils.config import frontend_origins, settings

app = FastAPI(
    title="Academic-Career Alignment API",
    version="1.0.0",
    description="Local backend for analyzing alignment indicators between university course specifications and job profiles.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check() -> dict:
    return {"status": "ok", "app": "academic-career-alignment-api"}


app.include_router(jobs_router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(course_router, prefix="/api/course", tags=["Course"])
app.include_router(match_router, prefix="/api", tags=["Match"])
