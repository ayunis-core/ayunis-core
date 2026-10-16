import extractErrorData from '@/shared/api/extract-error-data';

const ERROR_COPY: Record<string, string> = {
  NAME_TAKEN_AT_TARGET: 'errors.nameTaken',
  HANDOVER_NOT_PENDING: 'errors.notPending',
  HANDOVER_ALREADY_PENDING: 'errors.alreadyPending',
};

export function handoverErrorKey(error: unknown): string {
  try {
    return ERROR_COPY[extractErrorData(error).code] ?? 'errors.generic';
  } catch {
    return 'errors.generic';
  }
}
