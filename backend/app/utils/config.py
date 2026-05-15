from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    frontend_origin: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
    jobs_file: str = "./data/jobs.json"
    max_pdf_size_mb: int = 20
    database_url: str = ""
    jobs_table: str = "jobs"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore")


settings = Settings()


def frontend_origins() -> list[str]:
    origins = [origin.strip().rstrip("/") for origin in settings.frontend_origin.split(",") if origin.strip()]
    local_defaults = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]
    return sorted(set([*origins, *local_defaults]))
