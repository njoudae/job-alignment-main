import { BookOpenCheck, GraduationCap, Lightbulb, Printer, X } from 'lucide-react';
import { translations, type Language } from '../i18n';
import type { MatchResponse } from '../types';
import { buildAlignmentReport, type AlignmentSuggestion, type NormalizedAlignmentReport } from '../utils/reportAdapter';
import AxisRadarChart from './AxisRadarChart';
import ScoreBadge from './ScoreBadge';

interface Props {
  open: boolean;
  onClose: () => void;
  data: MatchResponse | null;
  language: Language;
}

function ChipList({ items, emptyMessage }: { items: string[]; emptyMessage: string }) {
  if (!items.length) return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
          {item}
        </span>
      ))}
    </div>
  );
}

function InfoRow({ label, value, fallback }: { label: string; value: string; fallback: string }) {
  return (
    <p className="text-sm text-slate-700">
      <span className="font-semibold text-slate-900">{label}:</span> {value || fallback}
    </p>
  );
}

function SnapshotCard({
  title,
  rows,
  chipGroups,
  bullets,
  fallback,
  responsibilitiesLabel,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
  chipGroups: Array<{ label: string; items: string[]; empty: string }>;
  bullets?: string[];
  fallback: string;
  responsibilitiesLabel: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 p-5">
      <h4 className="mb-4 text-lg font-semibold text-slate-900">{title}</h4>
      <div className="space-y-2">
        {rows.map((row) => (
          <InfoRow key={row.label} label={row.label} value={row.value} fallback={fallback} />
        ))}
      </div>
      <div className="mt-4 space-y-4">
        {chipGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-sm font-semibold text-slate-800">{group.label}</p>
            <ChipList items={group.items} emptyMessage={group.empty} />
          </div>
        ))}
      </div>
      {bullets?.length ? (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">{responsibilitiesLabel}</p>
          <ul className="list-disc space-y-2 ps-5 text-sm text-slate-700">
            {bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function FindingBlock({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="mb-2 font-medium text-slate-800">{title}</p>
      <ChipList items={items} emptyMessage={empty} />
    </div>
  );
}

function priorityClass(priority: AlignmentSuggestion['priority']) {
  if (priority === 'High') return 'bg-rose-50 text-rose-700 ring-rose-200';
  if (priority === 'Medium') return 'bg-amber-50 text-amber-700 ring-amber-200';
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
}

function priorityLabel(priority: AlignmentSuggestion['priority'], language: Language) {
  if (language === 'ar') {
    if (priority === 'High') return 'مرتفعة';
    if (priority === 'Medium') return 'متوسطة';
    return 'منخفضة';
  }
  return priority;
}

function SuggestionList({ title, items, language }: { title: string; items: AlignmentSuggestion[]; language: Language }) {
  if (!items.length) return null;
  const t = translations[language].report;
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <h5 className="mb-3 font-semibold text-slate-900">{title}</h5>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={`${item.addition}-${item.reason}`} className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${priorityClass(item.priority)}`}>
                {priorityLabel(item.priority, language)} {t.priority}
              </span>
              {item.relatedRequirement ? (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                  {t.related}: {item.relatedRequirement}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-slate-800"><span className="font-semibold">{t.suggestedAddition}:</span> {item.addition}</p>
            <p className="mt-2 text-sm text-slate-600"><span className="font-semibold text-slate-700">{t.reason}:</span> {item.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuidanceColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="mb-2 font-semibold text-slate-900">{title}</p>
      <ul className="list-disc space-y-2 ps-5 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ReportHeader({ report, language }: { report: NormalizedAlignmentReport; language: Language }) {
  const t = translations[language].report;
  return (
    <div className="rounded-3xl bg-slate-950 p-6 text-white">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">{t.label}</p>
          <h3 className="mt-2 text-3xl font-bold">{t.title}</h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            {t.headerNote}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-80">
          <div className="w-full rounded-2xl bg-white p-3 text-slate-900">
            <ScoreBadge score={report.overallScore} label={t.score} />
          </div>
          <div className="w-full rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">{t.evidenceConfidence}</p>
            <p className="mt-1 text-lg font-semibold">{report.evidenceConfidence}</p>
          </div>
        </div>
      </div>
      {report.executiveSummary ? <p className="mt-5 text-sm leading-6 text-slate-200">{report.executiveSummary}</p> : null}
    </div>
  );
}

export default function AnalysisModal({ open, onClose, data, language }: Props) {
  if (!open || !data) return null;

  const t = translations[language].report;
  const report = buildAlignmentReport(data, language);
  const radarData = report.axes.map((axis) => ({ name: axis.label, score: axis.score, rationale: axis.rationale }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 no-print">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[32px] bg-white p-6 shadow-2xl print-shell">
        <div className="mb-5 flex flex-wrap justify-end gap-2 no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Printer className="h-4 w-4" />
            {t.print}
          </button>
          <button onClick={onClose} className="rounded-2xl p-2 text-slate-500 hover:bg-slate-100" aria-label={t.close}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div id="printable-report" className="space-y-6 print-report" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <ReportHeader report={report} language={language} />

          <section className="rounded-3xl border border-slate-200 p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-brand-600">
                <BookOpenCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-slate-900">{t.overview}</h4>
                <p className="text-sm text-slate-500">{t.overviewNote}</p>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <AxisRadarChart data={radarData} />
              <div className="space-y-4">
                {report.axes.map((axis) => (
                  <div key={axis.key}>
                    <div className="mb-1 flex items-center justify-between text-sm font-medium text-slate-700">
                      <span>{axis.label}</span>
                      <span>{axis.score}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-brand-500" style={{ width: `${axis.score}%` }} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{axis.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <SnapshotCard
              title={t.courseSnapshot}
              rows={[
                { label: t.courseTitle, value: report.courseSnapshot.title },
                { label: t.courseCode, value: report.courseSnapshot.code },
                { label: t.program, value: report.courseSnapshot.program },
                { label: t.levelYear, value: report.courseSnapshot.level },
              ]}
              chipGroups={[
                { label: t.mainTopics, items: report.courseSnapshot.topics, empty: t.noTopics },
                { label: t.mainSkills, items: report.courseSnapshot.skills, empty: t.noSkills },
                { label: t.tools, items: report.courseSnapshot.tools, empty: t.noTools },
              ]}
              fallback={t.notSpecified}
              responsibilitiesLabel={t.mainResponsibilities}
            />
            <SnapshotCard
              title={t.jobSnapshot}
              rows={[
                { label: t.jobTitle, value: report.jobSnapshot.title },
                { label: t.jobId, value: report.jobSnapshot.jobId },
                { label: t.occupationalDomain, value: report.jobSnapshot.domain },
                { label: translations[language].unit, value: report.jobSnapshot.unit },
                { label: t.requiredEducation, value: report.jobSnapshot.education },
              ]}
              chipGroups={[
                { label: t.mainRequiredSkills, items: report.jobSnapshot.skills, empty: t.noRequiredSkills },
              ]}
              bullets={report.jobSnapshot.responsibilities}
              fallback={t.notSpecified}
              responsibilitiesLabel={t.mainResponsibilities}
            />
          </section>

          <section className="rounded-3xl border border-slate-200 p-5">
            <h4 className="mb-4 text-lg font-semibold text-slate-900">{t.evidenceFindings}</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <FindingBlock title={t.coveredSkills} items={report.coveredSkills} empty={t.noCoveredSkills} />
              <FindingBlock title={t.developmentAreas} items={report.developmentAreas} empty={t.noDevelopmentAreas} />
              <FindingBlock title={t.coveredResponsibilities} items={report.coveredResponsibilities} empty={t.noCoveredResponsibilities} />
              <FindingBlock title={t.uncoveredResponsibilities} items={report.uncoveredResponsibilities} empty={t.noUncoveredResponsibilities} />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-slate-900">{t.improvementSuggestions}</h4>
                <p className="text-sm text-slate-500">{t.improvementNote}</p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <SuggestionList title={t.knowledgeEnhancements} items={report.suggestions.knowledge} language={language} />
              <SuggestionList title={t.skillsEnhancements} items={report.suggestions.skills} language={language} />
              <SuggestionList title={t.practicalEnhancements} items={report.suggestions.practical} language={language} />
              <SuggestionList title={t.toolEnhancements} items={report.suggestions.tools} language={language} />
              <SuggestionList title={t.assessmentEnhancements} items={report.suggestions.assessment} language={language} />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-slate-900">{t.studentGuidance}</h4>
                <p className="text-sm text-slate-500">{t.studentGuidanceNote}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <GuidanceColumn title={t.readyFor} items={report.studentGuidance.readyFor} />
              <GuidanceColumn title={t.learnNext} items={report.studentGuidance.learnNext} />
              <GuidanceColumn title={t.miniProjects} items={report.studentGuidance.suggestedProjects} />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
