import type { AxisScore, MatchResponse } from '../types';

export interface AlignmentSuggestion {
  addition: string;
  reason: string;
  priority: 'High' | 'Medium' | 'Low';
  relatedRequirement?: string;
}

export interface NormalizedAxis {
  key: string;
  label: string;
  score: number;
  rationale: string;
}

export interface NormalizedAlignmentReport {
  overallScore: number;
  evidenceConfidence: 'High' | 'Medium' | 'Low';
  executiveSummary: string;
  finalVerdict: string;
  axes: NormalizedAxis[];
  courseSnapshot: {
    title: string;
    code: string;
    program: string;
    level: string;
    topics: string[];
    skills: string[];
    tools: string[];
    fullText: string;
  };
  jobSnapshot: {
    title: string;
    jobId: string;
    domain: string;
    unit: string;
    education: string;
    skills: string[];
    responsibilities: string[];
    originalTasks: string[];
  };
  coveredSkills: string[];
  developmentAreas: string[];
  coveredResponsibilities: string[];
  uncoveredResponsibilities: string[];
  suggestions: {
    knowledge: AlignmentSuggestion[];
    skills: AlignmentSuggestion[];
    practical: AlignmentSuggestion[];
    tools: AlignmentSuggestion[];
    assessment: AlignmentSuggestion[];
  };
  studentGuidance: {
    readyFor: string[];
    learnNext: string[];
    suggestedProjects: string[];
  };
  scopeNote: string;
  fairnessNote: string;
}

const axisLabels: Record<string, string> = {
  academic_alignment: 'Knowledge Alignment',
  knowledge_alignment: 'Knowledge Alignment',
  skill_alignment: 'Skill Alignment',
  task_alignment: 'Task Alignment',
  practical_readiness: 'Practical Readiness',
  tool_alignment: 'Tool Alignment',
  domain_relevance: 'Domain Relevance',
};

const desiredAxisOrder = [
  'academic_alignment',
  'skill_alignment',
  'task_alignment',
  'practical_readiness',
  'tool_alignment',
  'domain_relevance',
];

function compact(items: Array<string | null | undefined>, limit = 999) {
  const seen = new Set<string>();
  return items
    .map((item) => (item || '').trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function axisLookup(axes: AxisScore[]) {
  return axes.reduce<Record<string, AxisScore>>((acc, axis) => {
    acc[axis.name] = axis;
    return acc;
  }, {});
}

function normalizeAxes(axes: AxisScore[]): NormalizedAxis[] {
  const lookup = axisLookup(axes);
  return desiredAxisOrder.map((key) => {
    const axis = lookup[key] || lookup[key.replace('academic', 'knowledge')];
    return {
      key,
      label: axisLabels[key] || key,
      score: Math.max(0, Math.min(100, Number(axis?.score ?? 0))),
      rationale: axis?.rationale || `${axisLabels[key] || key} score derived from the current analysis.`,
    };
  });
}

function getAxisScore(axes: NormalizedAxis[], label: string) {
  return axes.find((axis) => axis.label === label)?.score ?? 0;
}

function hasArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

function shortResponsibility(task: string, index: number) {
  const clean = task.trim();
  if (!clean) return '';
  if (hasArabic(clean)) return `Responsibility ${index + 1} documented in original job task evidence.`;
  return clean.length > 130 ? `${clean.slice(0, 127)}...` : clean;
}

function confidenceFromEvidence(data: MatchResponse) {
  const course = data.course_profile;
  const evidenceCount = compact([
    course.course_description,
    ...course.course_main_objectives,
    ...course.CLOs,
    ...course.theoretical_topics,
    ...course.lab_topics,
    ...course.tools_software,
    ...course.practical_components,
    ...course.derived_employability_skills,
  ]).length;

  if (evidenceCount >= 12 && data.result.alignment_score >= 70) return 'High';
  if (evidenceCount >= 6) return 'Medium';
  return 'Low';
}

function suggestion(addition: string, reason: string, priority: 'High' | 'Medium' | 'Low', relatedRequirement?: string): AlignmentSuggestion {
  return { addition, reason, priority, relatedRequirement };
}

function deriveSuggestions(data: MatchResponse, axes: NormalizedAxis[]) {
  const missingSkills = compact(data.result.missing_skills, 5);
  const uncoveredResponsibilities = compact(data.result.uncovered_job_responsibilities, 5);
  const jobSkills = compact([...data.selected_job.technical_skills, ...data.selected_job.competency_details], 5);
  const recommendations = compact(data.result.recommendations_to_improve_course, 5);

  const knowledgeScore = getAxisScore(axes, 'Knowledge Alignment');
  const skillScore = getAxisScore(axes, 'Skill Alignment');
  const taskScore = getAxisScore(axes, 'Task Alignment');
  const practicalScore = getAxisScore(axes, 'Practical Readiness');
  const toolScore = getAxisScore(axes, 'Tool Alignment');

  const suggestions = {
    knowledge: [] as AlignmentSuggestion[],
    skills: [] as AlignmentSuggestion[],
    practical: [] as AlignmentSuggestion[],
    tools: [] as AlignmentSuggestion[],
    assessment: [] as AlignmentSuggestion[],
  };

  if (knowledgeScore < 75) {
    suggestions.knowledge.push(suggestion(
      `Add explicit concepts related to ${uncoveredResponsibilities[0] || jobSkills[0] || 'the selected occupational domain'}.`,
      'Knowledge evidence could be strengthened for requirements that are weakly covered in the uploaded specification.',
      knowledgeScore < 60 ? 'High' : 'Medium',
      uncoveredResponsibilities[0] || jobSkills[0],
    ));
  }

  if (skillScore < 75 || missingSkills.length) {
    suggestions.skills.push(suggestion(
      `Include targeted practice for ${missingSkills[0] || jobSkills[0] || 'job-relevant technical skills'}.`,
      'The selected job profile includes skills that are not explicitly evidenced in the uploaded specification.',
      missingSkills.length > 2 || skillScore < 60 ? 'High' : 'Medium',
      missingSkills[0] || jobSkills[0],
    ));
  }

  if (practicalScore < 75) {
    suggestions.practical.push(suggestion(
      'Add a hands-on lab or applied case that mirrors a realistic workplace task.',
      'Practical readiness improves when students produce evidence through labs, implementation tasks, or applied scenarios.',
      practicalScore < 60 ? 'High' : 'Medium',
      uncoveredResponsibilities[0],
    ));
  }

  if (toolScore < 75) {
    suggestions.tools.push(suggestion(
      `Introduce tool-based activities using ${jobSkills.find((item) => item.length < 50) || 'relevant industry tools and technologies'}.`,
      'Tool alignment is stronger when course evidence names technologies, platforms, or workflows used in the job profile.',
      toolScore < 60 ? 'High' : 'Medium',
      jobSkills[0],
    ));
  }

  if (taskScore < 75 || uncoveredResponsibilities.length) {
    suggestions.assessment.push(suggestion(
      'Add a project-based assessment mapped to one or more uncovered responsibilities.',
      'Assessment evidence can show whether students can apply knowledge and skills to job-relevant responsibilities.',
      uncoveredResponsibilities.length > 2 || taskScore < 60 ? 'High' : 'Medium',
      uncoveredResponsibilities[0],
    ));
  }

  if (!Object.values(suggestions).some((items) => items.length) && recommendations.length) {
    suggestions.skills.push(suggestion(
      recommendations[0],
      'This recommendation was provided by the current analysis and can be framed as a course enhancement.',
      'Low',
    ));
  }

  return suggestions;
}

function deriveStudentGuidance(data: MatchResponse) {
  const readySkills = compact(data.result.matched_skills, 3);
  const learnNext = compact([...data.result.missing_skills, ...data.selected_job.technical_skills], 4);
  const projectRequirements = compact(data.result.uncovered_job_responsibilities, 2);

  return {
    readyFor: readySkills.length
      ? readySkills.map((skill) => `Foundational work involving ${skill}.`)
      : ['Foundational exposure in the documented course topics and learning outcomes.'],
    learnNext: learnNext.length
      ? learnNext.map((skill) => `Strengthen ${skill}.`)
      : ['Build more explicit evidence around job-relevant tools, tasks, and applied skills.'],
    suggestedProjects: projectRequirements.length
      ? projectRequirements.map((task) => `Mini-project: produce an applied deliverable related to ${task}.`)
      : ['Mini-project: build a small portfolio task that uses course concepts in a workplace scenario.'],
  };
}

export function buildAlignmentReport(data: MatchResponse): NormalizedAlignmentReport {
  const course = data.course_profile;
  const job = data.selected_job;
  const axes = normalizeAxes(data.result.axis_scores);
  const context = data.academic_context;

  const topics = compact([...course.theoretical_topics, ...course.lab_topics, ...course.course_main_objectives], 5);
  const skills = compact([...course.derived_employability_skills, ...course.CLOs], 5);
  const tools = compact(course.tools_software, 5);
  const courseText = compact([
    course.course_description,
    ...course.course_main_objectives,
    ...course.CLOs,
    ...course.theoretical_topics,
    ...course.lab_topics,
    ...course.practical_components,
    course.raw_text_excerpt,
  ]).join('\n');

  return {
    overallScore: data.result.alignment_score,
    evidenceConfidence: confidenceFromEvidence(data),
    executiveSummary: data.result.executive_summary || data.result.final_verdict,
    finalVerdict: data.result.final_verdict,
    axes,
    courseSnapshot: {
      title: course.course_title || 'Not specified',
      code: course.course_code || 'Not specified',
      program: context?.programMajor || course.program || 'Not specified',
      level: 'Not specified in uploaded evidence',
      topics,
      skills,
      tools,
      fullText: courseText || 'No extracted course text excerpt is available.',
    },
    jobSnapshot: {
      title: job.job_title,
      jobId: job.job_id,
      domain: job.main_group || job.sub_group || 'Not specified',
      unit: job.unit || 'Not specified',
      education: job.minimum_education || 'Not specified',
      skills: compact([...job.technical_skills, ...job.soft_skills], 5),
      responsibilities: compact(job.main_tasks.map(shortResponsibility), 3),
      originalTasks: compact(job.main_tasks),
    },
    coveredSkills: compact(data.result.matched_skills),
    developmentAreas: compact(data.result.missing_skills),
    coveredResponsibilities: compact(data.result.matched_tasks),
    uncoveredResponsibilities: compact(data.result.uncovered_job_responsibilities),
    suggestions: deriveSuggestions(data, axes),
    studentGuidance: deriveStudentGuidance(data),
    scopeNote: 'Current analysis is based on the uploaded course specification and selected job profile. Future versions can aggregate multiple course levels, related courses, or a complete study plan to produce program-level readiness insights.',
    fairnessNote: 'The result is based only on evidence found in the uploaded specification. Skills may exist in teaching practice or related courses even if they are not explicitly documented.',
  };
}
