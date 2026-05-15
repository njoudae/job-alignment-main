import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, BriefcaseBusiness, FileSearch, Loader2, Sparkles } from 'lucide-react';
import AnalysisModal from './components/AnalysisModal';
import FileDropzone from './components/FileDropzone';
import SectionCard from './components/SectionCard';
import SelectField from './components/SelectField';
import { courseApi, healthApi, jobsApi, matchApi } from './services/api';
import { translations, type Language } from './i18n';
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

function defaultEvidenceLabel(scope: AnalysisScope, index: number, language: Language) {
  if (language === 'ar') {
    if (scope === 'Single Course') return 'المقرر الرئيس';
    if (scope === 'Multiple Levels of Same Course') return `المستوى ${index + 1}`;
    if (scope === 'Related Courses Cluster') return index === 0 ? 'المقرر الرئيس' : `مقرر مرتبط ${index + 1}`;
    return index === 0 ? 'مقرر رئيس في الخطة' : `ملف خطة ${index + 1}`;
  }
  if (scope === 'Single Course') return 'Main Course';
  if (scope === 'Multiple Levels of Same Course') return `Level ${index + 1}`;
  if (scope === 'Related Courses Cluster') return index === 0 ? 'Primary Course' : `Related Course ${index + 1}`;
  return index === 0 ? 'Main Study Plan Course' : `Study Plan File ${index + 1}`;
}

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
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
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const t = translations[language];

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    healthApi.check()
      .then(() => setBackendAvailable(true))
      .catch(() => setBackendAvailable(false));
  }, []);

  useEffect(() => {
    jobsApi.getHierarchy()
      .then(setHierarchy)
      .catch((err) => {
        const detail = err?.response?.data?.detail;
        if (err?.response?.status === 404) {
          setError(
            language === 'ar'
              ? 'لم يتم العثور على نقطة تحميل بيانات الوظائف. تحقق من إعداد VITE_API_BASE_URL في Vercel.'
              : 'Jobs dataset endpoint not found. Check VITE_API_BASE_URL in Vercel.'
          );
          return;
        }
        if (typeof detail === 'string' && detail.toLowerCase().includes('jobs file not found')) {
          setError(
            language === 'ar'
              ? 'ملف بيانات الوظائف غير موجود في نشر الباكند.'
              : 'Jobs dataset file is missing on the backend deployment.'
          );
          return;
        }
        setError(detail || t.errors.hierarchy);
      });
  }, [language, t.errors.hierarchy]);

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
  const trackSelectOptions = useMemo(
    () => trackOptions.map((value) => ({ value, label: t.tracks[value as keyof typeof t.tracks] ?? value })),
    [t],
  );
  const scopeSelectOptions = useMemo(
    () => analysisScopes.map((value) => ({ value, label: t.scopes[value] })),
    [t],
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
      const listJob = jobs.find((job) => job.job_id === value) ?? null;
      setSelectedJob(listJob);
      if (value) {
        jobsApi.getDetail(value)
          .then(setSelectedJob)
          .catch((err) => setError(err?.response?.data?.detail || t.errors.detail));
      }
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
        label: defaultEvidenceLabel(academicContext.analysisScope, prev.length + index, language),
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
        label: defaultEvidenceLabel(academicContext.analysisScope, academicContext.analysisScope === 'Single Course' ? 0 : prev.length, language),
        sampleFileName: filename,
      },
    ]);
  };

  const handleScopeChange = (value: string) => {
    const analysisScope = value as AnalysisScope;
    setAcademicContext((prev) => ({ ...prev, analysisScope }));
    setCourseFiles((prev) => {
      const scopedFiles = analysisScope === 'Single Course' ? prev.slice(0, 1) : prev;
      return scopedFiles.map((item, index) => ({ ...item, label: defaultEvidenceLabel(analysisScope, index, language) }));
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
      setError(t.errors.noJob);
      return;
    }
    const primaryEvidence = courseFiles[0];
    if (!primaryEvidence) {
      setError(t.errors.noFile);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const course = primaryEvidence.sampleFileName
        ? await courseApi.parseSample(primaryEvidence.sampleFileName)
        : await courseApi.parse(primaryEvidence.file as File);
      setParsedCourse(course);
      const match = await matchApi.analyze(course.profile, selectedJob, academicContext, language);
      setResult(match);
      setModalOpen(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || t.errors.analysis);
    } finally {
      setLoading(false);
    }
  };

  const isProgramScope = academicContext.analysisScope !== 'Single Course';

  if (!started) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#eef4ff_100%)] px-6 py-10 text-slate-950">
        <div className="absolute right-6 top-6 flex rounded-full border border-slate-200 bg-white p-1 text-sm shadow-soft">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`rounded-full px-4 py-2 font-semibold ${language === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {t.languageEnglish}
          </button>
          <button
            type="button"
            onClick={() => setLanguage('ar')}
            className={`rounded-full px-4 py-2 font-semibold ${language === 'ar' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {t.languageArabic}
          </button>
        </div>
        <section className="w-full max-w-4xl text-center">
          <img
            src="/project-logo.jpg"
            alt="Project logo"
            className="mx-auto h-auto w-full max-w-md object-contain mix-blend-multiply"
          />
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">{t.introEyebrow}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">{t.introTitle}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
            {t.introDescription}
          </p>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="mt-8 rounded-2xl bg-brand-600 px-10 py-4 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            {t.start}
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
            <h2 className="text-xl font-bold text-slate-900">{t.loadingTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {t.loadingBody}
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[32px] border border-white/60 bg-white/80 p-8 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 lg:text-5xl">{t.appName}</h1>
              <p className="mt-4 max-w-3xl text-slate-600">
                {t.description}
              </p>
              <p className={`mt-3 text-sm font-medium ${backendAvailable ? 'text-emerald-700' : backendAvailable === false ? 'text-rose-700' : 'text-slate-500'}`}>
                {backendAvailable ? t.backendOnline : backendAvailable === false ? t.backendOffline : ''}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm lg:w-[420px]">
              <div className="col-span-2 inline-flex w-fit justify-self-end rounded-full border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`rounded-full px-4 py-2 font-semibold ${language === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {t.languageEnglish}
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ar')}
                  className={`rounded-full px-4 py-2 font-semibold ${language === 'ar' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {t.languageArabic}
                </button>
              </div>
              <div className="rounded-2xl bg-slate-900 p-4 text-white">
                <p className="text-slate-300">{t.loadedJobs}</p>
                <p className="mt-2 text-2xl font-semibold">{hierarchy?.total_jobs ?? '-'}</p>
              </div>
              <div className="rounded-2xl bg-brand-600 p-4 text-white">
                <p className="text-blue-100">{t.workflow}</p>
                <p className="mt-2 text-lg font-semibold">{t.workflowValue}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <SectionCard
              title={t.selectJobTitle}
              subtitle={t.selectJobSubtitle}
              icon={<BriefcaseBusiness className="h-5 w-5" />}
              required
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <SelectField
                  label={t.minimumEducation}
                  value={selected.education}
                  onChange={(value) => handleSelectionChange('education', value)}
                  options={hierarchy?.education_options.map((item) => item.value) ?? []}
                  placeholder={t.selectEducation}
                  required
                />
                <SelectField
                  label={t.mainGroup}
                  value={selected.mainGroup}
                  onChange={(value) => handleSelectionChange('mainGroup', value)}
                  options={mainGroups}
                  placeholder={t.selectMainGroup}
                  disabled={!selected.education}
                  required
                />
                <SelectField
                  label={t.specialization}
                  value={selected.specialization}
                  onChange={(value) => handleSelectionChange('specialization', value)}
                  options={specializations}
                  placeholder={t.selectSpecialization}
                  disabled={!selected.mainGroup}
                  required
                />
                <SelectField
                  label={t.unit}
                  value={selected.unit}
                  onChange={(value) => handleSelectionChange('unit', value)}
                  options={units}
                  placeholder={t.selectUnit}
                  disabled={!selected.specialization}
                  required
                />
                <SelectField
                  label={t.finalJob}
                  value={selected.jobId}
                  onChange={(value) => handleSelectionChange('jobId', value)}
                  options={jobs.map((job) => ({ value: job.job_id, label: `${job.job_id} - ${job.job_title}` }))}
                  placeholder={t.selectFinalJob}
                  disabled={!selected.unit}
                  required
                />
              </div>

              {selected.unit && jobs.length > 0 ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-800">{t.availableJobs}</p>
                  <ul className="mt-2 list-disc space-y-1 ps-5">
                    {jobs.map((job) => (
                      <li key={job.job_id}>{job.job_id} - {job.job_title}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              title={t.academicContextTitle}
              subtitle={t.academicContextSubtitle}
              icon={<BookOpenCheck className="h-5 w-5" />}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">{t.programMajor}</span>
                  <input
                    value={academicContext.programMajor}
                    onChange={(e) => setAcademicContext((prev) => ({ ...prev, programMajor: e.target.value }))}
                    placeholder={t.programPlaceholder}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <SelectField
                  label={t.trackField}
                  value={academicContext.trackField}
                  onChange={(value) => setAcademicContext((prev) => ({ ...prev, trackField: value }))}
                  options={trackSelectOptions}
                  placeholder={t.selectTrack}
                />
                <SelectField
                  label={t.analysisScope}
                  value={academicContext.analysisScope}
                  onChange={handleScopeChange}
                  options={scopeSelectOptions}
                  placeholder={t.selectScope}
                />
              </div>
              {isProgramScope ? (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  {t.roadmapNotice}
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              title={t.uploadTitle}
              subtitle={t.uploadSubtitle}
              icon={<FileSearch className="h-5 w-5" />}
              required
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
                language={language}
              />
              {parsedCourse ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  {t.parsed}: <span className="font-semibold">{parsedCourse.profile.course_title || t.unnamedCourse}</span> - {parsedCourse.pages} {t.pages} - {parsedCourse.extracted_characters} {t.charsExtracted}.
                </div>
              ) : null}
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard
              title={t.runTitle}
              subtitle={t.runSubtitle}
              icon={<Sparkles className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <button
                  onClick={analyze}
                  disabled={loading}
                  className="w-full rounded-2xl bg-brand-600 px-5 py-4 text-base font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? t.analyzing : t.analyze}
                </button>

                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">{t.fairnessNoteTitle}</p>
                  <p className="mt-2 leading-6">
                    {t.fairnessNote}
                  </p>
                </div>

                {selectedJob ? (
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{t.selectedJobProfile}</p>
                    <p className="mt-2">{selectedJob.job_title} ({selectedJob.job_id})</p>
                    <p className="mt-2 text-slate-500">{selectedJob.summary || t.noSummary}</p>
                  </div>
                ) : null}

                {courseFiles.length > 1 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    {t.multiFileNotice}
                  </div>
                ) : null}

                {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
                {result ? <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">{t.reportReady}</div> : null}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      <AnalysisModal open={modalOpen} onClose={() => setModalOpen(false)} data={result} language={language} />
    </main>
  );
}
