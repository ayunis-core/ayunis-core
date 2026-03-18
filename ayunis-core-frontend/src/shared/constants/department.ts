/**
 * Selectable department keys — mirrors the backend `department.constants.ts`.
 * Do NOT duplicate freely — the backend is the single source of truth.
 */
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

/**
 * Maximum length for the free-text "other" department field.
 * The backend enforces `@MaxLength(100)` on the stored value, and the
 * `other:` prefix consumes 6 characters, leaving 94 for user input.
 */
export const DEPARTMENT_OTHER_MAX_LENGTH = 94;
