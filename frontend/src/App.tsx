import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, BriefcaseBusiness, FileSearch, Loader2, Sparkles } from 'lucide-react';
import AnalysisModal from './components/AnalysisModal';
import FileDropzone from './components/FileDropzone';
import SectionCard from './components/SectionCard';
import SelectField from './components/SelectField';
import { courseApi, jobsApi, matchApi } from './services/api';
import type {
  AcademicContext,
  AnalysisScope,
  CleanedJob,
  CourseEvidenceFile,
  CourseParseResponse,
  JobHierarchyResponse,
  MatchResponse,
  SampleCourseFile,
} from './types';
import { defaultSelections, getJobs, getMainGroups, getSpecializations, getUnits, type HierarchySelections } from './utils/hierarchy';

const trackOptions = [
  'Computer Science',
  'Software Development',
  'Databases',
  'Artificial Intelligence',
  'Cybersecurity',
  'Networks',
  'Information Systems',
];

const analysisScopes: AnalysisScope[] = [
  'Single Course',
  'Multiple Levels of Same Course',
  'Related Courses Cluster',
  'Full Study Plan',
];

const defaultAcademicContext: AcademicContext = {
  programMajor: '',
  trackField: 'Information Systems',
  analysisScope: 'Single Course',
};

function courseEvidenceId(name: string) {
  return `${Date.now()}-${name}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultEvidenceLabel(scope: AnalysisScope, index: number) {
  if (scope === 'Single Course') return 'Main Course';
  if (scope === 'Multiple Levels of Same Course') return `Level ${index + 1}`;
  if (scope === 'Related Courses Cluster') return index === 0 ? 'Primary Course' : `Related Course ${index + 1}`;
  return index === 0 ? 'Main Study Plan Course' : `Study Plan File ${index + 1}`;
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [hierarchy, setHierarchy] = useState<JobHierarchyResponse | null>(null);
  const [selected, setSelected] = useState<HierarchySelections>(defaultSelections);
  const [selectedJob, setSelectedJob] = useState<CleanedJob | null>(null);
  const [courseFiles, setCourseFiles] = useState<CourseEvidenceFile[]>([]);
  const [sampleFiles, setSampleFiles] = useState<SampleCourseFile[]>([]);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [academicContext, setAcademicContext] = useState<AcademicContext>(defaultAcademicContext);
  const [parsedCourse, setParsedCourse] = useState<CourseParseResponse | null>(null);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    jobsApi.getHierarchy()
      .then(setHierarchy)
      .catch((err) => setError(err?.response?.data?.detail || 'Failed to load jobs hierarchy.'));
  }, []);

  useEffect(() => {
    setSampleLoading(true);
    courseApi.listSampleFiles()
      .then((data) => setSampleFiles(data.items))
      .catch(() => setSampleFiles([]))
      .finally(() => setSampleLoading(false));
  }, []);

  const mainGroups = useMemo(() => (hierarchy ? getMainGroups(hierarchy.items, selected.education) : []), [hierarchy, selected.education]);
  const specializations = useMemo(
    () => (hierarchy ? getSpecializations(hierarchy.items, selected.education, selected.mainGroup) : []),
    [hierarchy, selected.education, selected.mainGroup],
  );
  const units = useMemo(
    () => (hierarchy ? getUnits(hierarchy.items, selected.education, selected.mainGroup, selected.specialization) : []),
    [hierarchy, selected.education, selected.mainGroup, selected.specialization],
  );
  const jobs = useMemo(
    () => (hierarchy ? getJobs(hierarchy.items, selected.education, selected.mainGroup, selected.specialization, selected.unit) : []),
    [hierarchy, selected.education, selected.mainGroup, selected.specialization, selected.unit],
  );

  const handleSelectionChange = (field: keyof HierarchySelections, value: string) => {
    setError('');
    setResult(null);
    setSelectedJob(null);

    if (field === 'education') {
      setSelected({ education: value, mainGroup: '', specialization: '', unit: '', jobId: '' });
      return;
    }
    if (field === 'mainGroup') {
      setSelected((prev) => ({ ...prev, mainGroup: value, specialization: '', unit: '', jobId: '' }));
      return;
    }
    if (field === 'specialization') {
      setSelected((prev) => ({ ...prev, specialization: value, unit: '', jobId: '' }));
      return;
    }
    if (field === 'unit') {
      setSelected((prev) => ({ ...prev, unit: value, jobId: '' }));
      return;
    }
    if (field === 'jobId') {
      setSelected((prev) => ({ ...prev, jobId: value }));
      setSelectedJob(jobs.find((job) => job.job_id === value) ?? null);
    }
  };

  const handleAddFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    setParsedCourse(null);
    setResult(null);
    setCourseFiles((prev) => {
      const selectedFiles = academicContext.analysisScope === 'Single Course' ? Array.from(files).slice(0, 1) : Array.from(files);
      const additions = selectedFiles.map((file, index) => ({
        id: courseEvidenceId(file.name),
        name: file.name,
        size: file.size,
        label: defaultEvidenceLabel(academicContext.analysisScope, prev.length + index),
        file,
      }));
      if (academicContext.analysisScope === 'Single Course') return additions;
      return [...prev, ...additions];
    });
  };

  const handleUseSample = (filename: string) => {
    const sample = sampleFiles.find((item) => item.filename === filename);
    if (!sample) return;
    setError('');
    setParsedCourse(null);
    setResult(null);
    setCourseFiles((prev) => [
      ...(academicContext.analysisScope === 'Single Course' ? [] : prev.filter((item) => item.sampleFileName !== filename)),
      {
        id: courseEvidenceId(filename),
        name: filename,
        size: sample.size_bytes,
        label: defaultEvidenceLabel(academicContext.analysisScope, academicContext.analysisScope === 'Single Course' ? 0 : prev.length),
        sampleFileName: filename,
      },
    ]);
  };

  const handleScopeChange = (value: string) => {
    const analysisScope = value as AnalysisScope;
    setAcademicContext((prev) => ({ ...prev, analysisScope }));
    setCourseFiles((prev) => {
      const scopedFiles = analysisScope === 'Single Course' ? prev.slice(0, 1) : prev;
      return scopedFiles.map((item, index) => ({ ...item, label: defaultEvidenceLabel(analysisScope, index) }));
    });
  };

  const updateEvidenceLabel = (id: string, label: string) => {
    setCourseFiles((prev) => prev.map((item) => (item.id === id ? { ...item, label } : item)));
  };

  const removeEvidenceFile = (id: string) => {
    setParsedCourse(null);
    setResult(null);
    setCourseFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const analyze = async () => {
    if (!selectedJob) {
      setError('Please select a job profile first.');
      return;
    }
    const primaryEvidence = courseFiles[0];
    if (!primaryEvidence) {
      setError('Please upload a course specification PDF or choose a sample course file first.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const course = primaryEvidence.sampleFileName
        ? await courseApi.parseSample(primaryEvidence.sampleFileName)
        : await courseApi.parse(primaryEvidence.file as File);
      setParsedCourse(course);
      const match = await matchApi.analyze(course.profile, selectedJob, academicContext);
      setResult(match);
      setModalOpen(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Analysis could not be completed. Please verify the API key, PDF content, and backend server.');
    } finally {
      setLoading(false);
    }
  };

  const isProgramScope = academicContext.analysisScope !== 'Single Course';

  if (!started) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#eef4ff_100%)] px-6 py-10 text-slate-950">
        <section className="w-full max-w-4xl text-center">
          <img
            src="/project-logo.jpg"
            alt="Project logo"
            className="mx-auto h-auto w-full max-w-md object-contain mix-blend-multiply"
          />
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">Academic-Career Alignment</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">Alignment Analyzer</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
            A decision-support system that compares academic course evidence with job profile requirements to highlight alignment indicators,
            development areas, and suggested enhancements.
          </p>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="mt-8 rounded-2xl bg-brand-600 px-10 py-4 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            Start
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.10),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8 text-slate-900">
      {loading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="w-[90%] max-w-md rounded-3xl border border-white/20 bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Analyzing Academic-Career Alignment</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The system is extracting course evidence, reviewing the selected job profile, and preparing a decision-support report.
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[32px] border border-white/60 bg-white/80 p-8 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Local AI Alignment System</p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 lg:text-5xl">Academic-Career Alignment Analyzer</h1>
              <p className="mt-4 max-w-3xl text-slate-600">
                A decision-support tool that compares evidence from uploaded course specifications with Saudi job profile requirements,
                highlighting alignment indicators, development areas, and suggested enhancements.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm lg:w-[360px]">
              <div className="rounded-2xl bg-slate-900 p-4 text-white">
                <p className="text-slate-300">Loaded Jobs</p>
                <p className="mt-2 text-2xl font-semibold">{hierarchy?.total_jobs ?? '-'}</p>
              </div>
              <div className="rounded-2xl bg-brand-600 p-4 text-white">
                <p className="text-blue-100">Workflow</p>
                <p className="mt-2 text-lg font-semibold">Select, Upload, Analyze</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <SectionCard
              title="1. Select Job Profile"
              subtitle="Hierarchical selection based on cleaned Saudi occupation data."
              icon={<BriefcaseBusiness className="h-5 w-5" />}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <SelectField
                  label="Minimum Education"
                  value={selected.education}
                  onChange={(value) => handleSelectionChange('education', value)}
                  options={hierarchy?.education_options.map((item) => item.value) ?? []}
                  placeholder="Select education"
                />
                <SelectField
                  label="Main Group / Domain"
                  value={selected.mainGroup}
                  onChange={(value) => handleSelectionChange('mainGroup', value)}
                  options={mainGroups}
                  placeholder="Select main group"
                  disabled={!selected.education}
                />
                <SelectField
                  label="Specialization"
                  value={selected.specialization}
                  onChange={(value) => handleSelectionChange('specialization', value)}
                  options={specializations}
                  placeholder="Select specialization"
                  disabled={!selected.mainGroup}
                />
                <SelectField
                  label="Unit"
                  value={selected.unit}
                  onChange={(value) => handleSelectionChange('unit', value)}
                  options={units}
                  placeholder="Select unit"
                  disabled={!selected.specialization}
                />
                <SelectField
                  label="Final Job"
                  value={selected.jobId}
                  onChange={(value) => handleSelectionChange('jobId', value)}
                  options={jobs.map((job) => ({ value: job.job_id, label: `${job.job_id} - ${job.job_title}` }))}
                  placeholder="Select final job"
                  disabled={!selected.unit}
                />
              </div>

              {selected.unit && jobs.length > 0 ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-800">Available Jobs in This Branch</p>
                  <ul className="mt-2 list-disc space-y-1 ps-5">
                    {jobs.map((job) => (
                      <li key={job.job_id}>{job.job_id} - {job.job_title}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              title="2. Academic Context"
              subtitle="Adds program-level context for scalable academic-career alignment reporting."
              icon={<BookOpenCheck className="h-5 w-5" />}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Program / Major</span>
                  <input
                    value={academicContext.programMajor}
                    onChange={(e) => setAcademicContext((prev) => ({ ...prev, programMajor: e.target.value }))}
                    placeholder="e.g., Information Systems"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <SelectField
                  label="Track / Field"
                  value={academicContext.trackField}
                  onChange={(value) => setAcademicContext((prev) => ({ ...prev, trackField: value }))}
                  options={trackOptions}
                  placeholder="Select track"
                />
                <SelectField
                  label="Analysis Scope"
                  value={academicContext.analysisScope}
                  onChange={handleScopeChange}
                  options={analysisScopes}
                  placeholder="Select scope"
                />
              </div>
              {isProgramScope ? (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  This prototype will aggregate uploaded course evidence for demonstration. Program-level analysis is part of the scalable roadmap.
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              title="3. Upload Course Evidence"
              subtitle="Upload one or more course PDFs. Current analysis uses the first evidence file and keeps the rest visible for roadmap demonstrations."
              icon={<FileSearch className="h-5 w-5" />}
            >
              <FileDropzone
                files={courseFiles}
                sampleFiles={sampleFiles}
                sampleLoading={sampleLoading}
                analysisScope={academicContext.analysisScope}
                onAddFiles={handleAddFiles}
                onRemove={removeEvidenceFile}
                onLabelChange={updateEvidenceLabel}
                onUseSample={handleUseSample}
              />
              {parsedCourse ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  Parsed: <span className="font-semibold">{parsedCourse.profile.course_title || 'Unnamed course'}</span> - {parsedCourse.pages} pages - {parsedCourse.extracted_characters} chars extracted.
                </div>
              ) : null}
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard
              title="4. Run Alignment Analysis"
              subtitle="Decision-support analysis with fair handling of missing or implicit academic evidence."
              icon={<Sparkles className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <button
                  onClick={analyze}
                  disabled={loading}
                  className="w-full rounded-2xl bg-brand-600 px-5 py-4 text-base font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Analyzing alignment...' : 'Analyze Alignment'}
                </button>

                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">Fairness note</p>
                  <p className="mt-2 leading-6">
                    The result is based only on evidence found in the uploaded specification. Skills may exist in teaching practice or related courses
                    even if they are not explicitly documented.
                  </p>
                </div>

                {selectedJob ? (
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">Selected Job Profile</p>
                    <p className="mt-2">{selectedJob.job_title} ({selectedJob.job_id})</p>
                    <p className="mt-2 text-slate-500">{selectedJob.summary || 'No summary available.'}</p>
                  </div>
                ) : null}

                {courseFiles.length > 1 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Multiple files are attached visually. This prototype sends the first evidence file to the current analysis endpoint.
                  </div>
                ) : null}

                {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
                {result ? <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">Latest alignment report is ready and opened in presentation view.</div> : null}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      <AnalysisModal open={modalOpen} onClose={() => setModalOpen(false)} data={result} />
    </main>
  );
}
