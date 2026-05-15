import axios from 'axios';
import type { AcademicContext, CourseParseResponse, JobHierarchyResponse, MatchResponse, CleanedJob, CourseProfile, SampleCourseFile } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
});

export const jobsApi = {
  async getHierarchy() {
    const { data } = await api.get<JobHierarchyResponse>('/jobs/hierarchy');
    return data;
  },
  async search(q: string) {
    const { data } = await api.get<{ items: CleanedJob[]; total: number }>('/jobs/search', { params: { q } });
    return data;
  },
};

export const courseApi = {
  async listSampleFiles() {
    const { data } = await api.get<{ items: SampleCourseFile[] }>('/course/sample-files');
    return data;
  },
  async parse(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<CourseParseResponse>('/course/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  async parseSample(filename: string) {
    const { data } = await api.post<CourseParseResponse>(`/course/sample-files/${encodeURIComponent(filename)}/parse`);
    return data;
  },
};

export const matchApi = {
  async analyze(courseProfile: CourseProfile, selectedJob: CleanedJob, academicContext?: AcademicContext) {
    const { data } = await api.post<MatchResponse>('/match', {
      course_profile: courseProfile,
      selected_job: selectedJob,
      academic_context: academicContext,
    });
    return data;
  },
};
