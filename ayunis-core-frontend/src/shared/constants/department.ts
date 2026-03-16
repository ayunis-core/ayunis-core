import { RegisterDtoDepartment } from '@/shared/api/generated/ayunisCoreAPI.schemas';

/**
 * Selectable department keys derived from the backend OpenAPI schema.
 * Do NOT duplicate — the backend `department.constants.ts` is the single source of truth.
 */
export const DEPARTMENT_KEYS = Object.values(RegisterDtoDepartment);

export type DepartmentKey = (typeof DEPARTMENT_KEYS)[number];

/**
 * Maximum length for the free-text "other" department field.
 * The backend enforces `@MaxLength(100)` on the stored value, and the
 * `other:` prefix consumes 6 characters, leaving 94 for user input.
 */
export const DEPARTMENT_OTHER_MAX_LENGTH = 94;
