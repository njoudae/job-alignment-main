import type { Language } from '../i18n';

export interface CleanedJob {
  job_id: string;
  job_title: string;
  main_group?: string | null;
  main_group_id?: string | null;
  sub_group?: string | null;
  sub_group_id?: string | null;
  secondary_group?: string | null;
  secondary_group_id?: string | null;
  unit?: string | null;
  unit_id?: string | null;
  summary?: string | null;
  main_tasks: string[];
  entry_level?: string | null;
  minimum_education?: string | null;
  specific_education: string[];
  related_experience?: string | null;
  technical_skills: string[];
  soft_skills: string[];
  standard_job_levels: string[];
  competency_details: string[];
}

export interface JobHierarchyItem {
  minimum_education: string;
  main_group: string;
  specialization: string;
  unit: string;
  jobs: CleanedJob[];
}

export interface JobHierarchyResponse {
  items: JobHierarchyItem[];
  total_jobs: number;
  education_options: { label: string; value: string }[];
  main_group_options: { label: string; value: string }[];
}

export interface CourseProfile {
  course_title?: string | null;
  course_code?: string | null;
  program?: string | null;
  institution?: string | null;
  course_description?: string | null;
  course_main_objectives: string[];
  CLOs: string[];
  theoretical_topics: string[];
  lab_topics: string[];
  tools_software: string[];
  practical_components: string[];
  derived_employability_skills: string[];
  extraction_notes: string[];
  raw_text_excerpt?: string | null;
}

export interface CourseParseResponse {
  profile: CourseProfile;
  pages: number;
  extracted_characters: number;
}

export interface SampleCourseFile {
  filename: string;
  size_bytes: number;
}

export type AnalysisScope = 'Single Course' | 'Multiple Levels of Same Course' | 'Related Courses Cluster' | 'Full Study Plan';

export interface AcademicContext {
  programMajor: string;
  trackField: string;
  analysisScope: AnalysisScope;
}

export interface CourseEvidenceFile {
  id: string;
  name: string;
  size: number;
  label: string;
  file?: File;
  sampleFileName?: string;
}

export interface AxisScore {
  name: string;
  score: number;
  rationale: string;
}

export interface MatchResult {
  alignment_score: number;
  final_verdict: string;
  executive_summary: string;
  axis_scores: AxisScore[];
  matched_skills: string[];
  missing_skills: string[];
  matched_tasks: string[];
  uncovered_job_responsibilities: string[];
  practical_readiness_assessment: string;
  recommendations_to_improve_course: string[];
  degree_requirement_assessment: string;
  inferred_degree_handling_note: string;
}

export interface MatchResponse {
  course_profile: CourseProfile;
  selected_job: CleanedJob;
  result: MatchResult;
  academic_context?: AcademicContext | null;
  language?: Language;
}
