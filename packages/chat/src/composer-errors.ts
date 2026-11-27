import { toast } from '@ayunis/ui/lib/toast';

const SOURCE_UPLOAD_ERROR_KEYS: Readonly<Record<string, string>> = {
  INVALID_FILE_TYPE: 'sources.invalidFileTypeError',
  UNSUPPORTED_FILE_TYPE: 'sources.invalidFileTypeError',
  EMPTY_FILE_DATA: 'sources.fileSourceEmptyDataError',
  FILE_TOO_LARGE: 'sources.fileSourceTooLargeError',
  TOO_MANY_PAGES: 'sources.fileSourceTooManyPagesError',
  UNPROCESSABLE_DOCUMENT: 'sources.fileSourceUnreadableError',
  UNPROCESSABLE_SPREADSHEET: 'sources.fileSourceUnreadableError',
  SOURCE_LIMIT_EXCEEDED: 'sources.sourceLimitExceededError',
  SOURCE_UPLOAD_NOT_FOUND: 'sources.uploadInterruptedError',
  SOURCE_UPLOAD_EXPIRED: 'sources.uploadInterruptedError',
  SOURCE_UPLOAD_INCOMPLETE: 'sources.uploadInterruptedError',
  SOURCE_UPLOAD_REQUEST_NOT_ALLOWED: 'sources.uploadInterruptedError',
  NO_PERMITTED_EMBEDDING_MODEL: 'sources.noEmbeddingModelError',
  EMBEDDINGS_PROVIDER_NOT_FOUND: 'sources.embeddingModelUnavailableError',
  EMBEDDINGS_PROVIDER_NOT_AVAILABLE: 'sources.embeddingModelUnavailableError',
  SERVICE_BUSY: 'sources.fileSourceServiceBusyError',
  STORAGE_UNAVAILABLE: 'sources.fileSourceServiceBusyError',
  SERVICE_TIMEOUT: 'sources.fileSourceTimeoutError',
  SPREADSHEET_PARSE_TIMEOUT: 'sources.fileSourceTimeoutError',
};

interface ApiErrorResponse {
  readonly code: string;
  readonly status: number;
}

function apiErrorResponse(error: unknown): ApiErrorResponse | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if (!('isAxiosError' in error) || error.isAxiosError !== true)
    return undefined;
  const { response } = error as {
    response?: { status?: number; data?: { code?: unknown } };
  };
  const code = response?.data?.code;
  return {
    code: typeof code === 'string' ? code : 'UNKNOWN_ERROR',
    status: response?.status ?? 500,
  };
}

export function sourceUploadErrorKey(error: unknown): string {
  const response = apiErrorResponse(error);
  if (!response) return 'sources.failedToAdd';
  // A proxy or the body-size limit can reject with a bare 413 before the
  // backend's FILE_TOO_LARGE mapping runs.
  const code =
    response.status === 413 && response.code === 'UNKNOWN_ERROR'
      ? 'FILE_TOO_LARGE'
      : response.code;
  // Provider outages arrive as PROVIDER_UNAVAILABLE_<CLASS>_<PROVIDER>.
  if (code.startsWith('PROVIDER_UNAVAILABLE')) {
    return code.includes('_TIMEOUT_')
      ? 'sources.fileSourceTimeoutError'
      : 'sources.fileSourceServiceBusyError';
  }
  return SOURCE_UPLOAD_ERROR_KEYS[code] ?? 'sources.failedToAdd';
}

export function sourceRemoveErrorKey(error: unknown): string {
  return apiErrorResponse(error)?.code === 'SOURCE_NOT_FOUND'
    ? 'chatInput.sourceNotFound'
    : 'chatInput.fileSourceDeleteError';
}

export function showComposerError(message: string): void {
  toast.error(message, { position: 'bottom-center', closeButton: true });
}
