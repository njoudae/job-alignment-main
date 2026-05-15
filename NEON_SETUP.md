# Neon Setup

This project can use Neon Postgres as a free cloud database for `jobs.json`.

The backend is intentionally hybrid:

- If `DATABASE_URL` is set, it reads jobs from Neon.
- If `DATABASE_URL` is empty, it reads `backend/data/jobs.json` locally.

## 1. Create Neon Database

1. Create a Neon project.
2. Copy the pooled or direct Postgres connection string.
3. Put it in `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@ep-example.neon.tech/dbname?sslmode=require
JOBS_TABLE=jobs
```

Neon recommends storing the connection string in an environment variable such as `DATABASE_URL`.

## 2. Create Table

You can either run this SQL in Neon SQL Editor:

```sql
create table if not exists jobs (
  job_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists jobs_payload_gin_idx on jobs using gin (payload);
```

Or let the import script create the table automatically.

## 3. Import jobs.json

From the backend folder:

```powershell
cd backend
python -m pip install -r requirements.txt
python scripts/import_jobs_to_neon.py
```

The script reads `backend/data/jobs.json` and upserts each job into Neon.

## 4. Production Env Vars

Set these in your backend hosting environment:

```env
DATABASE_URL=your_neon_connection_string
JOBS_TABLE=jobs
OPENAI_API_KEY=your_openai_key
FRONTEND_ORIGIN=https://your-frontend-domain.vercel.app
```

Do not put `DATABASE_URL` in frontend environment variables.
