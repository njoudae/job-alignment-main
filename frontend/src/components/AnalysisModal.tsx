import { BookOpenCheck, GraduationCap, Lightbulb, X } from 'lucide-react';
import type { MatchResponse } from '../types';
import { buildAlignmentReport, type AlignmentSuggestion, type NormalizedAlignmentReport } from '../utils/reportAdapter';
import AxisRadarChart from './AxisRadarChart';
import ScoreBadge from './ScoreBadge';

interface Props {
  open: boolean;
  onClose: () => void;
  data: MatchResponse | null;
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-slate-700">
      <span className="font-semibold text-slate-900">{label}:</span> {value || 'Not specified'}
    </p>
  );
}

function SnapshotCard({
  title,
  rows,
  chipGroups,
  bullets,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
  chipGroups: Array<{ label: string; items: string[]; empty: string }>;
  bullets?: string[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 p-5">
      <h4 className="mb-4 text-lg font-semibold text-slate-900">{title}</h4>
      <div className="space-y-2">
        {rows.map((row) => (
          <InfoRow key={row.label} label={row.label} value={row.value} />
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
          <p className="mb-2 text-sm font-semibold text-slate-800">Main Responsibilities</p>
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

function SuggestionList({ title, items }: { title: string; items: AlignmentSuggestion[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <h5 className="mb-3 font-semibold text-slate-900">{title}</h5>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={`${item.addition}-${item.reason}`} className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${priorityClass(item.priority)}`}>
                {item.priority} priority
              </span>
              {item.relatedRequirement ? (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                  Related: {item.relatedRequirement}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-slate-800"><span className="font-semibold">Suggested addition:</span> {item.addition}</p>
            <p className="mt-2 text-sm text-slate-600"><span className="font-semibold text-slate-700">Reason:</span> {item.reason}</p>
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

function ReportHeader({ report }: { report: NormalizedAlignmentReport }) {
  return (
    <div className="rounded-3xl bg-slate-950 p-6 text-white">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">Alignment Report</p>
          <h3 className="mt-2 text-3xl font-bold">Academic-Career Alignment Report</h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            This report highlights alignment indicators, development areas, and suggested enhancements. It is a decision-support analysis,
            not a final academic judgment.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-2xl bg-white p-3 text-slate-900">
            <ScoreBadge score={report.overallScore} />
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Evidence Confidence</p>
            <p className="mt-1 text-lg font-semibold">{report.evidenceConfidence}</p>
          </div>
        </div>
      </div>
      {report.executiveSummary ? <p className="mt-5 text-sm leading-6 text-slate-200">{report.executiveSummary}</p> : null}
    </div>
  );
}

export default function AnalysisModal({ open, onClose, data }: Props) {
  if (!open || !data) return null;

  const report = buildAlignmentReport(data);
  const radarData = report.axes.map((axis) => ({ name: axis.label, score: axis.score, rationale: axis.rationale }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[32px] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex justify-end">
          <button onClick={onClose} className="rounded-2xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close report">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <ReportHeader report={report} />

          <section className="rounded-3xl border border-slate-200 p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-brand-600">
                <BookOpenCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-slate-900">Alignment Overview</h4>
                <p className="text-sm text-slate-500">Six indicators summarize how strongly the uploaded evidence supports job-profile readiness.</p>
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
              title="Course Snapshot"
              rows={[
                { label: 'Course Title', value: report.courseSnapshot.title },
                { label: 'Course Code', value: report.courseSnapshot.code },
                { label: 'Program', value: report.courseSnapshot.program },
                { label: 'Level / Year', value: report.courseSnapshot.level },
              ]}
              chipGroups={[
                { label: 'Main Extracted Topics', items: report.courseSnapshot.topics, empty: 'No topics were explicitly extracted.' },
                { label: 'Main Extracted Skills', items: report.courseSnapshot.skills, empty: 'No skills were explicitly extracted.' },
                { label: 'Tools / Technologies', items: report.courseSnapshot.tools, empty: 'No tools were explicitly documented.' },
              ]}
            />
            <SnapshotCard
              title="Job Snapshot"
              rows={[
                { label: 'Job Title', value: report.jobSnapshot.title },
                { label: 'Job ID', value: report.jobSnapshot.jobId },
                { label: 'Occupational Domain', value: report.jobSnapshot.domain },
                { label: 'Unit', value: report.jobSnapshot.unit },
                { label: 'Required Education', value: report.jobSnapshot.education },
              ]}
              chipGroups={[
                { label: 'Main Required Skills', items: report.jobSnapshot.skills, empty: 'No required skills were listed for this job.' },
              ]}
              bullets={report.jobSnapshot.responsibilities}
            />
          </section>

          <section className="rounded-3xl border border-slate-200 p-5">
            <h4 className="mb-4 text-lg font-semibold text-slate-900">Evidence-Based Findings</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <FindingBlock title="Covered Skills" items={report.coveredSkills} empty="No strongly covered skills were detected." />
              <FindingBlock title="Development Areas" items={report.developmentAreas} empty="No major skill development areas were listed." />
              <FindingBlock title="Covered Responsibilities" items={report.coveredResponsibilities} empty="No strongly covered responsibilities were detected." />
              <FindingBlock title="Uncovered Responsibilities" items={report.uncoveredResponsibilities} empty="No major uncovered responsibilities were listed." />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-slate-900">Improvement Suggestions</h4>
                <p className="text-sm text-slate-500">Suggested enhancements use academic language and focus on strengthening documented evidence.</p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <SuggestionList title="Knowledge Enhancements" items={report.suggestions.knowledge} />
              <SuggestionList title="Skills Enhancements" items={report.suggestions.skills} />
              <SuggestionList title="Practical/Lab Enhancements" items={report.suggestions.practical} />
              <SuggestionList title="Tool/Technology Enhancements" items={report.suggestions.tools} />
              <SuggestionList title="Assessment Enhancements" items={report.suggestions.assessment} />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-slate-900">Student Guidance</h4>
                <p className="text-sm text-slate-500">Practical guidance for learners who want to turn the findings into next steps.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <GuidanceColumn title="Already Prepared For" items={report.studentGuidance.readyFor} />
              <GuidanceColumn title="Learn Next" items={report.studentGuidance.learnNext} />
              <GuidanceColumn title="Mini-Projects" items={report.studentGuidance.suggestedProjects} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
