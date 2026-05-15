# Academic-Career Alignment Analyzer

A production/demo-ready decision-support prototype that compares a university course specification PDF with a selected Saudi job profile. The system extracts course evidence, evaluates alignment indicators, highlights development areas, and produces a bilingual Arabic/English report.

This system is a decision-support prototype. It analyzes evidence available in uploaded course specifications and selected job profiles; it does not replace academic review.

## Features

- React + Vite frontend with Arabic/English language switch and RTL support.
- FastAPI backend for job hierarchy, PDF parsing, and AI-assisted alignment.
- Bilingual analysis report with professional academic Arabic or English output.
- Printable A4 report view that prints only the report content.
- Sample course PDF support from `backend/sample_files`.
- Local demo CORS defaults for Firefox/Chrome on Vite dev ports.
- Health endpoint at `GET /health` and `GET /api/health`.

## Architecture

- Frontend: `frontend/`, React 18, Vite, TypeScript, Tailwind CSS, Recharts.
- Backend: `backend/`, FastAPI, Pydantic, Uvicorn.
- AI/NLP analysis: OpenAI API extracts course profile fields and generates structured alignment results.
- PDF extraction: `pdfplumber`, `PyMuPDF`, and `pypdf` fallbacks.
- Job dataset: local `backend/data/jobs.json` by default, with optional Neon/Postgres support through `DATABASE_URL`.

## Requirements

- Node.js 18 or newer.
- Python 3.10 or newer.
- A valid `OPENAI_API_KEY` for PDF course extraction and AI alignment analysis.

## Environment Variables

Copy the examples before running:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Important values:

- `OPENAI_API_KEY`: required for analysis.
- `OPENAI_MODEL`: defaults to `gpt-4o`.
- `VITE_API_BASE_URL`: defaults to `http://localhost:8000/api`.
- `FRONTEND_ORIGIN`: comma-separated local frontend origins allowed by CORS.
- `JOBS_FILE`: defaults to `./data/jobs.json` relative to `backend`.
- `DATABASE_URL`: optional Neon/Postgres source for jobs.

## Install

From the repository root:

```bash
npm install
cd frontend
npm install
cd ../backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

If you are not using PowerShell, activate the virtual environment with the command appropriate for your shell.

## Run Frontend And Backend Together

After installing frontend and backend dependencies, run from the repository root:

```bash
npm run dev
```

This starts:

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

## Run Separately

Frontend only:

```bash
npm run dev:frontend
```

Backend only:

```bash
npm run dev:backend
```

`npm run dev:backend` automatically uses `backend/.venv` when it exists. Equivalent manual backend command:

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Test With The Sample Course File

1. Start the app with `npm run dev`.
2. Open `http://localhost:5173`.
3. Select a job profile from the hierarchy.
4. In the upload section, click `Use Sample Course File` / `استخدام ملف تجريبي`.
5. Click `Analyze Alignment` / `تحليل المواءمة`.
6. Review the report modal.
7. Click `Print Report` / `طباعة التقرير` to print only the report.

Sample PDFs are loaded from:

```text
backend/sample_files
```

If no sample appears, place a readable text-based course specification PDF in that folder and restart the backend.

## Language And Report Behavior

- Use the header switch to choose `English` or `العربية`.
- Arabic mode switches the UI to RTL and sends `language: "ar"` to the backend analysis endpoint.
- English mode sends `language: "en"`.
- Generated narrative fields, recommendations, notes, and report headings follow the selected language.
- Structured source data such as job titles, skills, tools, or course text may remain in the original source language for accuracy.

## API Endpoints

- `GET /health`
- `GET /api/health`
- `GET /api/jobs/hierarchy`
- `GET /api/jobs/search?q=...`
- `GET /api/jobs/detail/{job_id}`
- `GET /api/course/sample-files`
- `POST /api/course/parse`
- `POST /api/course/sample-files/{filename}/parse`
- `POST /api/match`

`POST /api/match` accepts:

```json
{
  "course_profile": {},
  "selected_job": {},
  "academic_context": {},
  "language": "en"
}
```

Use `"ar"` for Arabic report generation.

## Build Check

```bash
npm run build
```

This runs the frontend TypeScript build and Vite production build through the root script.

## Deploy On CranL

Deploy this repository as two CranL applications from the same GitHub repo:

Backend application:

- Repository: `njoudae/job-alignment-main`
- Branch: `main`
- Build Type: `nixpacks` / auto-detect
- Build Path: `/backend`
- Start command: CranL/Nixpacks reads `backend/Procfile`
- Health check: `/api/health`

Backend environment variables:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o
FRONTEND_ORIGIN=https://your-frontend-app.cranl.net
JOBS_FILE=./data/jobs.json
MAX_PDF_SIZE_MB=20
JOBS_TABLE=jobs
```

If using a CranL PostgreSQL database, create the database and inject `DATABASE_URL` into the backend app. Then import job data once from a local machine or CranL shell:

```bash
cd backend
python scripts/import_jobs_to_neon.py
```

Frontend application:

- Repository: `njoudae/job-alignment-main`
- Branch: `main`
- Build Type: `nixpacks` / auto-detect
- Build Path: `/frontend`
- Build command: `npm run build`
- Start command: `npm run start`

Frontend environment variables:

```env
VITE_API_BASE_URL=https://your-backend-app.cranl.net/api
```

After both apps deploy, update backend `FRONTEND_ORIGIN` with the final frontend CranL URL and redeploy/restart the backend.

## Troubleshooting

Port already in use:

- Stop the process using port `5173` or `8000`.
- Or run Vite on another port and add that origin to `FRONTEND_ORIGIN`.

Backend not running:

- Open `http://localhost:8000/api/health`.
- If it fails, activate the Python virtual environment and run `npm run dev:backend`.

Missing API key:

- Add `OPENAI_API_KEY` to `backend/.env`.
- Restart the backend after changing `.env`.

CORS error:

- Confirm `VITE_API_BASE_URL=http://localhost:8000/api`.
- Confirm `FRONTEND_ORIGIN` includes the frontend origin, for example `http://localhost:5173`.

PDF upload error:

- Only PDF files are supported.
- Empty PDFs or scanned image-only PDFs may not contain readable text.
- Use a text-based course specification PDF for the demo.

Job data error:

- Confirm `backend/data/jobs.json` exists and is a JSON array of job objects.
- If using Neon/Postgres, confirm `DATABASE_URL` and `JOBS_TABLE`.

## Current Scope

The current implementation performs strong single-course analysis. Multiple uploaded files can be shown in the UI for demonstration, but the current analysis endpoint uses the first evidence file. Program-level aggregation is part of the scalable roadmap.
