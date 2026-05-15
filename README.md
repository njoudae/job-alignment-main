# Course-Job Alignment Analyzer (Project)

--- 
## 1)
![First](images/localhost_5173_.png)

## 2)
![Second](images/localhost_5173_1.png)

## 3) Result
![r1](images/localhost_5173_5.png)
![r2](images/localhost_5173_4.png)

---
A complete project for analyzing how well a university course specification aligns with a selected job profile.

It uses:
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** FastAPI + Pydantic
- **PDF extraction:** `pdfplumber` + `PyMuPDF` + `pypdf`
- **AI analysis:** OpenAI GPT-4o API
- **Data source:** local `jobs.json`

---

## 1) Proposed Architecture

The system is split into two layers:

### Backend (FastAPI)
Responsible for:
- loading `jobs.json`
- normalizing and cleaning job records
- building a **hierarchical job selection structure** for the frontend
- searching jobs by title or id
- extracting text from uploaded course PDFs
- asking GPT-4o to build a **structured course profile**
- asking GPT-4o to produce an **explainable alignment result**

### Frontend (React + Tailwind)
Responsible for:
- presenting a clean, hierarchical workflow
- letting the user select a job in a logical sequence
- uploading the course specification PDF
- launching the analysis
- showing the final result in a **presentation-ready modal** with:
  - score
  - verdict
  - matched/missing skills
  - matched/missing responsibilities
  - recommendations
  - radar chart and progress bars

---

## 2) Fairness and Explainability Decisions

This implementation directly follows your requested logic:

- The backend performs **strong normalization** before jobs are shown or used in matching.
- Missing or noisy values are cleaned where possible.
- `minimum_education` is treated as a **useful but non-hard field**.
- If the course specification does not explicitly state a degree, this is handled as **optional / inferred** and **does not sharply penalize the final score**.
- The matching result is explainable across these axes:
  - Academic Alignment
  - Skill Alignment
  - Task Alignment
  - Practical Readiness
  - Tool Alignment
  - Domain Relevance

---

## 3) Project Structure

```bash
course-job-alignment/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── course.py
│   │   │   ├── jobs.py
│   │   │   └── match.py
│   │   ├── schemas/
│   │   │   ├── course.py
│   │   │   ├── jobs.py
│   │   │   └── match.py
│   │   ├── services/
│   │   │   ├── course_service.py
│   │   │   ├── jobs_service.py
│   │   │   ├── match_service.py
│   │   │   └── pdf_service.py
│   │   └── utils/
│   │       ├── config.py
│   │       ├── openai_client.py
│   │       └── text.py
│   ├── data/
│   │   ├── jobs.sample.json
│   │   └── jobs.json   <-- place your real jobs file here
│   ├── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── images/
│   ├── Screenshot%202026-04-27%20194229.png
│   ├── Screenshot%202026-04-27%20194147.png
└── README.md
```

---

## 4) Backend Setup

### Step 1: open the backend folder
```bash
cd backend
```

### Step 2: create virtual environment
```bash
python -m venv .venv
```

### Step 3: activate it
**Windows PowerShell:**
```bash
.\.venv\Scripts\Activate.ps1
```

**Windows CMD:**
```bash
.\.venv\Scripts\activate.bat
```

### Step 4: install dependencies
```bash
pip install -r requirements.txt
```

### Step 5: create `.env`
Copy `.env.example` into `.env` and set your API key:

```env
OPENAI_API_KEY=your_real_openai_key
OPENAI_MODEL=gpt-4o
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_ORIGIN=http://localhost:5173
JOBS_FILE=./data/jobs.json
MAX_PDF_SIZE_MB=20
```

### Step 6: add your real jobs file
Copy your real JSON file to:

```bash
backend/data/jobs.json
```

If you do not yet have the final file, duplicate `jobs.sample.json` temporarily and rename it to `jobs.json`.

### Step 7: run backend
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend should open on:
```bash
http://localhost:8000
```

Health check:
```bash
http://localhost:8000/api/health
```

---

## 5) Frontend Setup

Open a second terminal.

### Step 1: go to frontend
```bash
cd frontend
```

### Step 2: install packages
```bash
npm install
```

### Step 3: run frontend
```bash
npm run dev
```

Frontend should open on:
```bash
http://localhost:5173
```

---

## 6) Main Endpoints

### `GET /api/jobs/hierarchy`
Returns a cleaned and organized hierarchy for the selection UI.

### `GET /api/jobs/search?q=...`
Search jobs by title or id.

### `POST /api/course/parse`
Accepts a PDF file and returns a structured course profile.

### `POST /api/match`
Accepts:
- `course_profile`
- `selected_job`

Returns the full alignment result.

---

## 7) Normalization Logic for Jobs

The backend already includes a reusable normalization layer that does the following:

- trims noisy whitespace
- removes duplicated items
- splits messy fields using separators such as new lines, commas, semicolons, pipes, and slashes
- cleans bullet prefixes
- normalizes many Arabic text variants for deduplication
- infers a canonical education label when possible
- attempts to separate **technical skills** and **soft skills**
- cleans `specific_education`, `standard_job_levels`, and other list-like fields

This makes the hierarchy and the matching process more stable and easier to explain in your presentation.

---

## 8) Matching Logic Summary

The matching is **not** simple keyword matching.

The system evaluates the course against the job using structured evidence from:
- course description
- objectives
- CLOs
- theoretical topics
- lab topics
- tools/software
- practical components
- derived employability skills

Then GPT-4o produces:
- `alignment_score`
- `final_verdict`
- `matched_skills`
- `missing_skills`
- `matched_tasks`
- `uncovered_job_responsibilities`
- `practical_readiness_assessment`
- `recommendations_to_improve_course`
- axis-by-axis rationale

It also follows the fairness rule you requested:
- missing degree mention is treated as **optional / inferred**
- it should **not sharply reduce** the final score

---

## 9) Example Usage Flow

1. Start backend.
2. Start frontend.
3. Open the app in the browser.
4. Choose:
   - Minimum Education
   - Main Group
   - Specialization
   - Unit
   - Final Job
5. Upload a course specification PDF.
6. Click **Analyze Alignment**.
7. Review the modal result:
   - course info
   - job info
   - alignment score
   - verdict
   - matched and missing skills
   - task coverage
   - readiness explanation
   - recommendations
   - radar chart and axis progress bars

---

## 10) Notes for Real Deployment Later

For now, this project is intentionally local and file-based.
A good next step later would be:
- caching GPT outputs
- saving analyses locally as JSON reports
- exporting PDF reports
- adding Arabic labels toggle in the UI
- adding OCR for image-based PDFs if needed

---

## 11) Important Practical Notes

- This project needs a valid **OpenAI API key**.
- If the uploaded PDF contains no readable text, parsing will fail. In that case OCR can be added later.
- For best results, use a well-structured course specification PDF.
- Replace `backend/data/jobs.json` with your actual jobs file before demo day.

---

## 12) Demo Script


> The system first normalizes the job taxonomy locally, so the user does not face a noisy or inconsistent JSON file directly. Then it guides the user through a hierarchical profession-selection flow. After the user uploads a course specification PDF, the backend extracts text locally, asks GPT-4o to build a structured course profile, and then performs an explainable multi-axis alignment analysis against the selected profession. The final result is shown in a clear modal with score, verdict, detailed gaps, readiness assessment, and actionable recommendations.

