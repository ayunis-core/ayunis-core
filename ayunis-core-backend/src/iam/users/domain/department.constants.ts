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
] as const;

export type DepartmentKey = (typeof DEPARTMENT_KEYS)[number];

const OTHER_PREFIX = 'other:';
const departmentKeySet: ReadonlySet<string> = new Set(DEPARTMENT_KEYS);

export function isValidDepartment(value: string): boolean {
  return (
    departmentKeySet.has(value) ||
    (value.startsWith(OTHER_PREFIX) && value.length > OTHER_PREFIX.length)
  );
}
