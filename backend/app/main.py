import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.routes.jobs import router as jobs_router
from app.routes.course import router as course_router
from app.routes.match import router as match_router
from app.routes.course import SAMPLE_FILES_DIR, get_sample_course_file, list_sample_course_files
from app.services.jobs_service import get_jobs_service
from app.utils.config import frontend_origins, settings

logger = logging.getLogger("academic-career-alignment")
logging.basicConfig(level=logging.INFO)
BACKEND_BASE_DIR = Path(__file__).resolve().parents[2]

app = FastAPI(
    title="Academic-Career Alignment API",
    version="1.0.0",
    description="API backend for academic-career alignment analysis.",
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


@app.get("/")
def root() -> dict:
    return {"message": "Academic Career Alignment API is running"}


@app.on_event("startup")
def log_data_paths() -> None:
    try:
        jobs_service = get_jobs_service()
        jobs_count = len(jobs_service.load_jobs())
        jobs_exists = jobs_service.jobs_path.exists()
        sample_pdfs = sorted(path.name for path in SAMPLE_FILES_DIR.glob("*.pdf") if path.is_file())
        logger.info("Current working directory: %s", Path.cwd())
        logger.info("Backend BASE_DIR: %s", BACKEND_BASE_DIR)
        logger.info("Expected jobs file path: %s", jobs_service.jobs_path)
        logger.info("Jobs file exists: %s", jobs_exists)
        logger.info("Number of loaded jobs: %s", jobs_count)
        logger.info("Expected sample_files path: %s", SAMPLE_FILES_DIR)
        logger.info("Sample PDFs found: %s", sample_pdfs)
    except Exception as exc:
        logger.exception("Startup data path check failed: %s", exc)


app.include_router(jobs_router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(course_router, prefix="/api/course", tags=["Course"])
app.include_router(match_router, prefix="/api", tags=["Match"])

# Compatibility aliases keep the API working if a deployed frontend is configured
# with the backend root URL instead of the preferred URL that ends in /api.
app.include_router(jobs_router, prefix="/jobs", tags=["Jobs"], include_in_schema=False)
app.include_router(course_router, prefix="/course", tags=["Course"], include_in_schema=False)
app.include_router(match_router, tags=["Match"], include_in_schema=False)


@app.get("/api/sample-files")
def list_sample_files_alias() -> dict:
    return list_sample_course_files()


@app.get("/api/sample-files/{filename}")
def get_sample_file_alias(filename: str) -> FileResponse:
    return get_sample_course_file(filename)
