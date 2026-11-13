export const CONTACT_ROLES = [
  'teacher',
  'researcher',
  'admissions',
  'parent',
  'student',
  'other',
] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export const CONTACT_LIMITS = {
  nameMin: 2,
  nameMax: 80,
  emailMax: 120,
  messageMin: 20,
  messageMax: 2000,
} as const;
