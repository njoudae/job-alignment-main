import { useState } from 'react';
import { FileText, FileUp, Plus, X } from 'lucide-react';
import { translations, type Language } from '../i18n';
import type { AnalysisScope, CourseEvidenceFile, SampleCourseFile } from '../types';

interface Props {
  files: CourseEvidenceFile[];
  sampleFiles: SampleCourseFile[];
  sampleLoading: boolean;
  analysisScope: AnalysisScope;
  onAddFiles: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  onLabelChange: (id: string, label: string) => void;
  onUseSample: (filename: string) => void;
  language: Language;
}

function formatFileSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function getScopeCopy(scope: AnalysisScope, language: Language) {
  const t = translations[language].fileDropzone;
  if (scope === 'Single Course') {
    return {
      description: t.singleDescription,
      addLabel: '',
      filePrefix: t.selectedCourse,
      labelOptions: [],
    };
  }
  if (scope === 'Multiple Levels of Same Course') {
    return {
      description: t.levelsDescription,
      addLabel: t.addAnotherLevel,
      filePrefix: '',
      labelOptions: t.labelOptions.level,
    };
  }
  if (scope === 'Related Courses Cluster') {
    return {
      description: t.clusterDescription,
      addLabel: t.addNextFile,
      filePrefix: '',
      labelOptions: t.labelOptions.cluster,
    };
  }
  return {
    description: t.planDescription,
    addLabel: t.addNextFile,
    filePrefix: '',
    labelOptions: t.labelOptions.plan,
  };
}

export default function FileDropzone({
  files,
  sampleFiles,
  sampleLoading,
  analysisScope,
  onAddFiles,
  onRemove,
  onLabelChange,
  onUseSample,
  language,
}: Props) {
  const t = translations[language].fileDropzone;
  const scopeCopy = getScopeCopy(analysisScope, language);
  const isSingleCourse = analysisScope === 'Single Course';
  const [dragActive, setDragActive] = useState(false);

  return (
    <div className="space-y-4">
      <div
        className={`rounded-3xl border border-dashed p-6 transition ${
          dragActive ? 'border-brand-500 bg-blue-50' : 'border-slate-300 bg-slate-50'
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          onAddFiles(event.dataTransfer.files);
        }}
      >
        <label className="flex cursor-pointer flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-white p-4 shadow-soft">
            <FileUp className="h-6 w-6 text-brand-600" />
          </div>
          <div>
            <p className="font-medium text-slate-800">{t.uploadTitle}</p>
            <p className="text-sm text-slate-500">{scopeCopy.description}</p>
          </div>
          <input
            type="file"
            accept="application/pdf"
            multiple={!isSingleCourse}
            className="hidden"
            onChange={(e) => onAddFiles(e.target.files)}
          />
        </label>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{t.sampleTitle}</p>
            <p className="text-xs text-slate-500">{t.sampleDescription}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sampleLoading ? (
              <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500">{t.loadingSamples}</span>
            ) : sampleFiles.length ? (
              sampleFiles.map((sample) => (
                <button
                  key={sample.filename}
                  type="button"
                  onClick={() => onUseSample(sample.filename)}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-blue-100"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {sample.filename}
                </button>
              ))
            ) : (
              <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{t.noSamples}</span>
            )}
          </div>
        </div>
      </div>

      {!isSingleCourse ? (
        <>
          <button
            type="button"
            onClick={() => document.getElementById('additional-course-files')?.click()}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            {scopeCopy.addLabel}
          </button>
          <input
            id="additional-course-files"
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => onAddFiles(e.target.files)}
          />
        </>
      ) : null}

      {files.length ? (
        <div className="space-y-3">
          {files.map((item, index) => (
            <div
              key={item.id}
              className={`grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:items-center ${
                isSingleCourse ? 'sm:grid-cols-[1fr_auto]' : 'sm:grid-cols-[1fr_180px_auto]'
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {index === 0 ? scopeCopy.filePrefix : ''}
                  {item.name}
                </p>
                <p className="text-xs text-slate-500">{formatFileSize(item.size)}{item.sampleFileName ? ` - ${t.sampleFile}` : ''}</p>
              </div>
              {!isSingleCourse ? (
                <select
                  value={item.label}
                  onChange={(e) => onLabelChange(item.id, e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-blue-100"
                >
                  {scopeCopy.labelOptions.map((label) => (
                    <option key={label} value={label}>{label}</option>
                  ))}
                </select>
              ) : null}
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="justify-self-start rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 sm:justify-self-end"
                aria-label={`${t.remove} ${item.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
