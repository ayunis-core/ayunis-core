export const DEPARTMENT_KEYS = [
  'hauptamt',
  'kaemmerei',
  'ordnungsamt',
  'bauamt',
  'sozialamt',
  'jugendamt',
  'standesamt',
  'einwohnermeldeamt',
  'schulamt',
  'kulturamt',
  'umweltamt',
  'tiefbauamt',
  'hochbauamt',
  'personalamt',
  'rechtsamt',
  'gesundheitsamt',
  'liegenschaftsamt',
  'it',
  'pressestelle',
  'other',
] as const;

export type DepartmentKey = (typeof DEPARTMENT_KEYS)[number];
