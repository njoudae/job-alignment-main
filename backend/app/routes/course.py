from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.services.course_service import CourseService
from app.services.pdf_service import PDFService
from app.utils.config import settings

router = APIRouter()
course_service = CourseService()
SAMPLE_FILES_DIR = Path(__file__).resolve().parents[2] / "sample_files"


def _validate_pdf_content(filename: str, content: bytes) -> None:
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    max_size = settings.max_pdf_size_mb * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail=f"PDF exceeds the maximum size of {settings.max_pdf_size_mb} MB.")


def _parse_pdf_content(content: bytes):
    extraction = PDFService.extract_text(content)
    if not extraction["text"].strip():
        raise HTTPException(status_code=400, detail="No readable text could be extracted from the PDF.")
    return course_service.parse_course_profile(extraction["text"], extraction["pages"])


@router.post("/parse")
async def parse_course_pdf(file: UploadFile = File(...)):
    content = await file.read()
    _validate_pdf_content(file.filename, content)

    try:
        return _parse_pdf_content(content)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to parse course PDF: {exc}") from exc


@router.get("/sample-files")
def list_sample_course_files():
    # Place demo-ready PDF files in backend/sample_files to make them selectable from the UI.
    SAMPLE_FILES_DIR.mkdir(exist_ok=True)
    files = [
        {
            "filename": path.name,
            "size_bytes": path.stat().st_size,
        }
        for path in sorted(SAMPLE_FILES_DIR.glob("*.pdf"))
        if path.is_file()
    ]
    return {"items": files}


@router.get("/sample-files/{filename}")
def get_sample_course_file(filename: str):
    safe_name = Path(filename).name
    path = SAMPLE_FILES_DIR / safe_name
    if not path.exists() or not path.is_file() or path.suffix.lower() != ".pdf":
        raise HTTPException(status_code=404, detail="Sample course file was not found.")
    return FileResponse(path, media_type="application/pdf", filename=safe_name)


@router.post("/sample-files/{filename}/parse")
def parse_sample_course_file(filename: str):
    safe_name = Path(filename).name
    path = SAMPLE_FILES_DIR / safe_name
    if not path.exists() or not path.is_file() or path.suffix.lower() != ".pdf":
        raise HTTPException(status_code=404, detail="Sample course file was not found.")

    content = path.read_bytes()
    _validate_pdf_content(safe_name, content)

    try:
        return _parse_pdf_content(content)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to parse sample course PDF: {exc}") from exc
