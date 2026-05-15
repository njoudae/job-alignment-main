import type { AxisScore, MatchResponse } from '../types';
import { translations, type Language } from '../i18n';

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
  evidenceConfidence: string;
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

const axisLabels: Record<Language, Record<string, string>> = {
  en: {
    academic_alignment: 'Knowledge Alignment',
    knowledge_alignment: 'Knowledge Alignment',
    skill_alignment: 'Skill Alignment',
    task_alignment: 'Task Alignment',
    practical_readiness: 'Practical Readiness',
    tool_alignment: 'Tool Alignment',
    domain_relevance: 'Domain Relevance',
  },
  ar: {
    academic_alignment: 'المواءمة المعرفية',
    knowledge_alignment: 'المواءمة المعرفية',
    skill_alignment: 'مواءمة المهارات',
    task_alignment: 'مواءمة المسؤوليات',
    practical_readiness: 'الجاهزية المهنية',
    tool_alignment: 'مواءمة الأدوات',
    domain_relevance: 'صلة المجال',
  },
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

function normalizeAxes(axes: AxisScore[], language: Language): NormalizedAxis[] {
  const lookup = axisLookup(axes);
  return desiredAxisOrder.map((key) => {
    const axis = lookup[key] || lookup[key.replace('academic', 'knowledge')];
    const label = axisLabels[language][key] || key;
    return {
      key,
      label,
      score: Math.max(0, Math.min(100, Number(axis?.score ?? 0))),
      rationale: axis?.rationale || (language === 'ar' ? `درجة ${label} مستمدة من التحليل الحالي.` : `${label} score derived from the current analysis.`),
    };
  });
}

function getAxisScore(axes: NormalizedAxis[], key: string) {
  return axes.find((axis) => axis.key === key)?.score ?? 0;
}

function hasArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

function shortResponsibility(task: string, index: number, language: Language) {
  const clean = task.trim();
  if (!clean) return '';
  if (hasArabic(clean) && language === 'en') return `Responsibility ${index + 1} documented in original job task evidence.`;
  return clean.length > 130 ? `${clean.slice(0, 127)}...` : clean;
}

function confidenceFromEvidence(data: MatchResponse, language: Language) {
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

  if (language === 'ar') {
    if (evidenceCount >= 12 && data.result.alignment_score >= 70) return 'مرتفع';
    if (evidenceCount >= 6) return 'متوسط';
    return 'منخفض';
  }
  if (evidenceCount >= 12 && data.result.alignment_score >= 70) return 'High';
  if (evidenceCount >= 6) return 'Medium';
  return 'Low';
}

function suggestion(addition: string, reason: string, priority: 'High' | 'Medium' | 'Low', relatedRequirement?: string): AlignmentSuggestion {
  return { addition, reason, priority, relatedRequirement };
}

function deriveSuggestions(data: MatchResponse, axes: NormalizedAxis[], language: Language) {
  const missingSkills = compact(data.result.missing_skills, 5);
  const uncoveredResponsibilities = compact(data.result.uncovered_job_responsibilities, 5);
  const jobSkills = compact([...data.selected_job.technical_skills, ...data.selected_job.competency_details], 5);
  const recommendations = compact(data.result.recommendations_to_improve_course, 5);

  const knowledgeScore = getAxisScore(axes, 'academic_alignment');
  const skillScore = getAxisScore(axes, 'skill_alignment');
  const taskScore = getAxisScore(axes, 'task_alignment');
  const practicalScore = getAxisScore(axes, 'practical_readiness');
  const toolScore = getAxisScore(axes, 'tool_alignment');

  const suggestions = {
    knowledge: [] as AlignmentSuggestion[],
    skills: [] as AlignmentSuggestion[],
    practical: [] as AlignmentSuggestion[],
    tools: [] as AlignmentSuggestion[],
    assessment: [] as AlignmentSuggestion[],
  };

  if (knowledgeScore < 75) {
    suggestions.knowledge.push(suggestion(
      language === 'ar'
        ? `إضافة مفاهيم صريحة مرتبطة بـ ${uncoveredResponsibilities[0] || jobSkills[0] || 'المجال المهني المختار'}.`
        : `Add explicit concepts related to ${uncoveredResponsibilities[0] || jobSkills[0] || 'the selected occupational domain'}.`,
      language === 'ar'
        ? 'يمكن تقوية الأدلة المعرفية للمتطلبات التي ظهرت تغطيتها محدودة في التوصيف المرفوع.'
        : 'Knowledge evidence could be strengthened for requirements that are weakly covered in the uploaded specification.',
      knowledgeScore < 60 ? 'High' : 'Medium',
      uncoveredResponsibilities[0] || jobSkills[0],
    ));
  }

  if (skillScore < 75 || missingSkills.length) {
    suggestions.skills.push(suggestion(
      language === 'ar'
        ? `تضمين تدريب موجه على ${missingSkills[0] || jobSkills[0] || 'مهارات تقنية مرتبطة بالمهنة'}.`
        : `Include targeted practice for ${missingSkills[0] || jobSkills[0] || 'job-relevant technical skills'}.`,
      language === 'ar'
        ? 'يتضمن الملف المهني المختار مهارات لم تظهر لها أدلة صريحة في التوصيف المرفوع.'
        : 'The selected job profile includes skills that are not explicitly evidenced in the uploaded specification.',
      missingSkills.length > 2 || skillScore < 60 ? 'High' : 'Medium',
      missingSkills[0] || jobSkills[0],
    ));
  }

  if (practicalScore < 75) {
    suggestions.practical.push(suggestion(
      language === 'ar'
        ? 'إضافة معمل تطبيقي أو حالة عملية تحاكي مهمة واقعية في بيئة العمل.'
        : 'Add a hands-on lab or applied case that mirrors a realistic workplace task.',
      language === 'ar'
        ? 'تتحسن الجاهزية المهنية عندما ينتج الطلاب أدلة من خلال المعامل أو مهام التنفيذ أو السيناريوهات التطبيقية.'
        : 'Practical readiness improves when students produce evidence through labs, implementation tasks, or applied scenarios.',
      practicalScore < 60 ? 'High' : 'Medium',
      uncoveredResponsibilities[0],
    ));
  }

  if (toolScore < 75) {
    suggestions.tools.push(suggestion(
      language === 'ar'
        ? `إدراج أنشطة قائمة على أدوات مثل ${jobSkills.find((item) => item.length < 50) || 'أدوات وتقنيات مهنية ذات صلة'}.`
        : `Introduce tool-based activities using ${jobSkills.find((item) => item.length < 50) || 'relevant industry tools and technologies'}.`,
      language === 'ar'
        ? 'تزداد مواءمة الأدوات عندما يذكر توصيف المقرر التقنيات أو المنصات أو سير العمل المستخدمة في الملف المهني.'
        : 'Tool alignment is stronger when course evidence names technologies, platforms, or workflows used in the job profile.',
      toolScore < 60 ? 'High' : 'Medium',
      jobSkills[0],
    ));
  }

  if (taskScore < 75 || uncoveredResponsibilities.length) {
    suggestions.assessment.push(suggestion(
      language === 'ar'
        ? 'إضافة تقويم قائم على مشروع مرتبط بمسؤولية واحدة أو أكثر من المسؤوليات غير المغطاة.'
        : 'Add a project-based assessment mapped to one or more uncovered responsibilities.',
      language === 'ar'
        ? 'يمكن لأدلة التقويم أن توضح قدرة الطلاب على تطبيق المعرفة والمهارات في مسؤوليات مرتبطة بالمهنة.'
        : 'Assessment evidence can show whether students can apply knowledge and skills to job-relevant responsibilities.',
      uncoveredResponsibilities.length > 2 || taskScore < 60 ? 'High' : 'Medium',
      uncoveredResponsibilities[0],
    ));
  }

  if (!Object.values(suggestions).some((items) => items.length) && recommendations.length) {
    suggestions.skills.push(suggestion(
      recommendations[0],
      language === 'ar'
        ? 'وردت هذه التوصية في التحليل الحالي ويمكن صياغتها كتحسين للمقرر.'
        : 'This recommendation was provided by the current analysis and can be framed as a course enhancement.',
      'Low',
    ));
  }

  return suggestions;
}

function deriveStudentGuidance(data: MatchResponse, language: Language) {
  const readySkills = compact(data.result.matched_skills, 3);
  const learnNext = compact([...data.result.missing_skills, ...data.selected_job.technical_skills], 4);
  const projectRequirements = compact(data.result.uncovered_job_responsibilities, 2);

  return {
    readyFor: readySkills.length
      ? readySkills.map((skill) => (language === 'ar' ? `عمل تأسيسي يتضمن ${skill}.` : `Foundational work involving ${skill}.`))
      : [language === 'ar' ? 'تعرض تأسيسي للموضوعات ومخرجات التعلم الموثقة في المقرر.' : 'Foundational exposure in the documented course topics and learning outcomes.'],
    learnNext: learnNext.length
      ? learnNext.map((skill) => (language === 'ar' ? `تعزيز ${skill}.` : `Strengthen ${skill}.`))
      : [language === 'ar' ? 'بناء أدلة أوضح حول الأدوات والمهام والمهارات التطبيقية المرتبطة بالمهنة.' : 'Build more explicit evidence around job-relevant tools, tasks, and applied skills.'],
    suggestedProjects: projectRequirements.length
      ? projectRequirements.map((task) => (language === 'ar' ? `مشروع صغير: إنتاج مخرج تطبيقي مرتبط بـ ${task}.` : `Mini-project: produce an applied deliverable related to ${task}.`))
      : [language === 'ar' ? 'مشروع صغير: بناء مهمة ملف إنجاز تستخدم مفاهيم المقرر في سيناريو مهني.' : 'Mini-project: build a small portfolio task that uses course concepts in a workplace scenario.'],
  };
}

export function buildAlignmentReport(data: MatchResponse, language: Language = 'en'): NormalizedAlignmentReport {
  const course = data.course_profile;
  const job = data.selected_job;
  const axes = normalizeAxes(data.result.axis_scores, language);
  const context = data.academic_context;
  const t = translations[language].report;

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
    evidenceConfidence: confidenceFromEvidence(data, language),
    executiveSummary: data.result.executive_summary || data.result.final_verdict,
    finalVerdict: data.result.final_verdict,
    axes,
    courseSnapshot: {
      title: course.course_title || t.notSpecified,
      code: course.course_code || t.notSpecified,
      program: context?.programMajor || course.program || t.notSpecified,
      level: language === 'ar' ? 'غير محدد في الأدلة المرفوعة' : 'Not specified in uploaded evidence',
      topics,
      skills,
      tools,
      fullText: courseText || t.noOriginalEvidence,
    },
    jobSnapshot: {
      title: job.job_title,
      jobId: job.job_id,
      domain: job.main_group || job.sub_group || t.notSpecified,
      unit: job.unit || t.notSpecified,
      education: job.minimum_education || t.notSpecified,
      skills: compact([...job.technical_skills, ...job.soft_skills], 5),
      responsibilities: compact(job.main_tasks.map((task, index) => shortResponsibility(task, index, language)), 3),
      originalTasks: compact(job.main_tasks),
    },
    coveredSkills: compact(data.result.matched_skills),
    developmentAreas: compact(data.result.missing_skills),
    coveredResponsibilities: compact(data.result.matched_tasks),
    uncoveredResponsibilities: compact(data.result.uncovered_job_responsibilities),
    suggestions: deriveSuggestions(data, axes, language),
    studentGuidance: deriveStudentGuidance(data, language),
    scopeNote: language === 'ar'
      ? 'يعتمد التحليل الحالي على توصيف المقرر المرفوع والملف المهني المختار. يمكن للإصدارات اللاحقة تجميع عدة مستويات من المقرر أو مقررات مترابطة أو خطة دراسية كاملة لإنتاج مؤشرات جاهزية على مستوى البرنامج.'
      : 'Current analysis is based on the uploaded course specification and selected job profile. Future versions can aggregate multiple course levels, related courses, or a complete study plan to produce program-level readiness insights.',
    fairnessNote: translations[language].fairnessNote,
  };
}
