export const DEFAULT_ACADEMY_MINIMUM_MODULE_SECONDS = 60;

export function isValidAcademyMinimumModuleSeconds(seconds: number): boolean {
  return Number.isInteger(seconds) && seconds >= 0;
}
