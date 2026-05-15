from __future__ import annotations

from io import BytesIO

import fitz
import pdfplumber
from pypdf import PdfReader

from app.utils.text import normalize_text


class PDFExtractionResult(dict):
    text: str
    pages: int


class PDFService:
    @staticmethod
    def extract_text(content: bytes) -> dict:
        text_parts: list[str] = []
        pages = 0

        try:
            with pdfplumber.open(BytesIO(content)) as pdf:
                pages = len(pdf.pages)
                for page in pdf.pages:
                    extracted = page.extract_text() or ""
                    if extracted.strip():
                        text_parts.append(extracted)
        except Exception:
            pass

        if not text_parts:
            try:
                doc = fitz.open(stream=content, filetype="pdf")
                pages = doc.page_count
                for page in doc:
                    extracted = page.get_text("text") or ""
                    if extracted.strip():
                        text_parts.append(extracted)
            except Exception:
                pass

        if not text_parts:
            reader = PdfReader(BytesIO(content))
            pages = len(reader.pages)
            for page in reader.pages:
                extracted = page.extract_text() or ""
                if extracted.strip():
                    text_parts.append(extracted)

        full_text = normalize_text("\n".join(text_parts))
        return {"text": full_text, "pages": pages}
