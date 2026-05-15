import type { CleanedJob, JobHierarchyItem } from '../types';

export interface HierarchySelections {
  education: string;
  mainGroup: string;
  specialization: string;
  unit: string;
  jobId: string;
}

export const defaultSelections: HierarchySelections = {
  education: '',
  mainGroup: '',
  specialization: '',
  unit: '',
  jobId: '',
};

export const getMainGroups = (items: JobHierarchyItem[], education: string): string[] => {
  return [...new Set(items.filter((item) => item.minimum_education === education).map((item) => item.main_group))];
};

export const getSpecializations = (items: JobHierarchyItem[], education: string, mainGroup: string): string[] => {
  return [
    ...new Set(
      items
        .filter((item) => item.minimum_education === education && item.main_group === mainGroup)
        .map((item) => item.specialization),
    ),
  ];
};

export const getUnits = (
  items: JobHierarchyItem[],
  education: string,
  mainGroup: string,
  specialization: string,
): string[] => {
  return [
    ...new Set(
      items
        .filter(
          (item) =>
            item.minimum_education === education && item.main_group === mainGroup && item.specialization === specialization,
        )
        .map((item) => item.unit),
    ),
  ];
};

export const getJobs = (
  items: JobHierarchyItem[],
  education: string,
  mainGroup: string,
  specialization: string,
  unit: string,
): CleanedJob[] => {
  return items.find(
    (item) =>
      item.minimum_education === education &&
      item.main_group === mainGroup &&
      item.specialization === specialization &&
      item.unit === unit,
  )?.jobs ?? [];
};
