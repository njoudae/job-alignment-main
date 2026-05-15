from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routes.jobs import router as jobs_router
from app.routes.course import router as course_router
from app.routes.match import router as match_router
from app.utils.config import frontend_origins, settings

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
FRONTEND_INDEX = FRONTEND_DIST / "index.html"

app = FastAPI(
    title="Academic-Career Alignment API",
    version="1.0.0",
    description="Backend API and frontend static server for academic-career alignment analysis.",
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
    return {"status": "ok"}


@app.get("/health")
def root_health_check() -> dict:
    return {"status": "ok"}


app.include_router(jobs_router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(course_router, prefix="/api/course", tags=["Course"])
app.include_router(match_router, prefix="/api", tags=["Match"])

if (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="frontend-assets")


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str) -> FileResponse:
    if full_path == "api" or full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found.")

    requested_file = FRONTEND_DIST / full_path
    if requested_file.is_file():
        return FileResponse(requested_file)

    if FRONTEND_INDEX.is_file():
        return FileResponse(FRONTEND_INDEX)

    raise HTTPException(status_code=404, detail="Frontend build was not found. Run `npm run build` before production startup.")
