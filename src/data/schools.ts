import schoolsData from './all_schools_code.json';

type SchoolGroupKey =
  | 'government_nursing_and_midwifery'
  | 'private_nursing_and_midwifery'
  | 'government_allied_health'
  | 'private_allied_health';

type SchoolGroup = {
  name: string;
  location: string;
};

const groupLabels: Record<SchoolGroupKey, string> = {
  government_nursing_and_midwifery: 'Government nursing and midwifery',
  private_nursing_and_midwifery: 'Private nursing and midwifery',
  government_allied_health: 'Government allied health',
  private_allied_health: 'Private allied health'
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const groups = schoolsData.health_training_institutions as Record<SchoolGroupKey, SchoolGroup[]>;

export const healthTrainingSchools = Object.entries(groups).flatMap(([groupKey, schools]) =>
  schools.map((school) => ({
    id: `${groupKey}-${slugify(school.name)}`,
    name: school.name,
    location: school.location,
    category: groupKey,
    categoryLabel: groupLabels[groupKey as SchoolGroupKey]
  }))
);

export type HealthTrainingSchool = (typeof healthTrainingSchools)[number];

export const findSchoolById = (schoolId?: string) =>
  schoolId ? healthTrainingSchools.find((school) => school.id === schoolId) : undefined;

export const findSchoolByName = (schoolName?: string) =>
  schoolName ? healthTrainingSchools.find((school) => school.name === schoolName) : undefined;
