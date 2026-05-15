from __future__ import annotations

import json
import os
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.types.json import Jsonb


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_JOBS_FILE = ROOT / "data" / "jobs.json"
BATCH_SIZE = 100


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.strip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def read_jobs(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("jobs.json must contain a list of job objects.")
    return data


def create_schema(connection: psycopg.Connection, table: str) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            sql.SQL(
                """
                create table if not exists {} (
                  job_id text primary key,
                  payload jsonb not null,
                  updated_at timestamptz not null default now()
                )
                """
            ).format(sql.Identifier(table))
        )
        cursor.execute(
            sql.SQL("create index if not exists {} on {} using gin (payload)").format(
                sql.Identifier(f"{table}_payload_gin_idx"),
                sql.Identifier(table),
            )
        )
    connection.commit()


def upsert_jobs(connection: psycopg.Connection, table: str, jobs: list[dict]) -> None:
    statement = sql.SQL(
        """
        insert into {} (job_id, payload)
        values (%s, %s)
        on conflict (job_id) do update
        set payload = excluded.payload,
            updated_at = now()
        """
    ).format(sql.Identifier(table))

    with connection.cursor() as cursor:
        for start in range(0, len(jobs), BATCH_SIZE):
            batch = jobs[start:start + BATCH_SIZE]
            rows = [
                (
                    str(job.get("job_id") or job.get("job_classification_id") or "").strip(),
                    Jsonb(job),
                )
                for job in batch
                if str(job.get("job_id") or job.get("job_classification_id") or "").strip()
            ]
            cursor.executemany(statement, rows)
            connection.commit()
            print(f"Uploaded {min(start + BATCH_SIZE, len(jobs))}/{len(jobs)} jobs")


def main() -> None:
    load_env_file(ROOT / ".env")
    database_url = os.environ.get("DATABASE_URL", "")
    jobs_file = Path(os.environ.get("JOBS_FILE", str(DEFAULT_JOBS_FILE)))
    table = os.environ.get("JOBS_TABLE", "jobs")

    if not database_url:
        raise SystemExit("Set DATABASE_URL to your Neon Postgres connection string before importing jobs.")

    jobs = read_jobs(jobs_file)
    with psycopg.connect(database_url) as connection:
        create_schema(connection, table)
        upsert_jobs(connection, table, jobs)

    print("Done.")


if __name__ == "__main__":
    main()
