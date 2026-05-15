from functools import lru_cache

from openai import OpenAI

from app.utils.config import settings


@lru_cache(maxsize=1)
def get_openai_client() -> OpenAI:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is missing. Add it to backend/.env before running AI analysis.")
    return OpenAI(api_key=settings.openai_api_key)
