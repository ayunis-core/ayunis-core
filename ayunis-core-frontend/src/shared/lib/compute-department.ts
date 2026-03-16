import type { RefinementCtx } from 'zod';
import { ZodIssueCode } from 'zod';

/**
 * Resolves the department value to send to the backend.
 *
 * - If no department is selected, returns `undefined`.
 * - If 'other' is selected, prefixes the trimmed free-text with `other:`.
 *   Returns `undefined` when the free-text is empty.
 * - Otherwise returns the department key as-is.
 */
export function computeDepartment(
  dept?: string,
  deptOther?: string,
): string | undefined {
  if (!dept) return undefined;
  if (dept === 'other') {
    const trimmed = deptOther?.trim();
    return trimmed ? `other:${trimmed}` : undefined;
  }
  return dept;
}

/**
 * Shared Zod superRefine callback that validates `departmentOther` is
 * non-empty when `department` is `'other'`.
 */
export function refineDepartmentOther(
  data: { department?: string; departmentOther?: string },
  ctx: RefinementCtx,
  message: string,
): void {
  if (data.department === 'other' && !data.departmentOther?.trim()) {
    ctx.addIssue({
      code: ZodIssueCode.custom,
      message,
      path: ['departmentOther'],
    });
  }
}
