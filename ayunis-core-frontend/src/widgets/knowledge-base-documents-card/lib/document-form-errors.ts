import type { TFunction } from 'i18next';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';

const VALIDATION_PREFIX = 'detail.documents.validation';

function errorData(error: unknown): ReturnType<typeof extractErrorData> | null {
  try {
    return extractErrorData(error);
  } catch {
    return null;
  }
}

/**
 * Errors the URL and re-index schedule dialogs show on their fields; mutation
 * hooks skip their toast for these so the user is not told twice.
 */
export function isDocumentFormFieldError(error: unknown): boolean {
  const data = errorData(error);
  if (data?.code === 'INVALID_REINDEX_INTERVAL') return true;
  return data?.code === 'VALIDATION_ERROR' && Boolean(data.errors?.length);
}

/** Returns whether the error was shown on the form's fields. */
export function setDocumentFormFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
  t: TFunction,
): boolean {
  const data = errorData(error);
  if (!data || !isDocumentFormFieldError(error)) return false;
  if (data.errors?.length) {
    setValidationErrors(form, data.errors, t, VALIDATION_PREFIX);
  } else {
    form.setError('reindexInterval.value' as Path<T>, {
      message: t(`${VALIDATION_PREFIX}.reindexInterval.value.invalid`),
    });
  }
  return true;
}

const REINDEX_SCHEDULE_ERROR_KEYS: Record<string, string> = {
  KNOWLEDGE_BASE_NOT_FOUND: 'detail.documents.reindex.notFound',
  DOCUMENT_NOT_IN_KNOWLEDGE_BASE: 'detail.documents.reindex.notFound',
  SOURCE_NOT_FOUND: 'detail.documents.reindex.notFound',
  SOURCE_REINDEX_NOT_SUPPORTED: 'detail.documents.reindex.notSupported',
};

export function reindexScheduleErrorKey(error: unknown): string {
  const code = errorData(error)?.code;
  return (
    (code && REINDEX_SCHEDULE_ERROR_KEYS[code]) ??
    'detail.documents.reindex.error'
  );
}
