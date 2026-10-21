import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import type { TFunction } from 'i18next';

/**
 * Shared error handler for file-source upload mutations.
 * Maps known backend error codes to user-facing toast messages.
 *
 * Works with any i18n namespace that contains the `sources.*` keys
 * (currently `common`, `skill` and `knowledge-bases`) — a new key must be
 * added to all of them, or the namespace that lacks it falls back to the
 * raw key.
 */
const BYTES_PER_MEGABYTE = 1024 * 1024;

// The limit is per organization, so only the backend's own rejection knows
// which one applied; a bare proxy 413 carries no limit.
function tooLargeMessage(
  t: TFunction,
  metadata: Record<string, unknown> | undefined,
): string {
  const maxFileSizeBytes = metadata?.maxFileSizeBytes;
  if (typeof maxFileSizeBytes !== 'number') {
    return t('sources.fileSourceTooLargeUnknownLimitError');
  }
  return t('sources.fileSourceTooLargeError', {
    max: Math.round(maxFileSizeBytes / BYTES_PER_MEGABYTE),
  });
}

export default function handleSourceUploadError(
  error: unknown,
  t: TFunction,
): void {
  try {
    const { code: responseCode, status, metadata } = extractErrorData(error);
    // A proxy or the body-size limit can reject with a bare 413 before the
    // backend's FILE_TOO_LARGE mapping runs.
    const code =
      status === 413 && responseCode === 'UNKNOWN_ERROR'
        ? 'FILE_TOO_LARGE'
        : responseCode;
    // Provider outages arrive as PROVIDER_UNAVAILABLE_<CLASS>_<PROVIDER>
    // (AYC-538) — map the class onto the existing busy/timeout toasts.
    if (code.startsWith('PROVIDER_UNAVAILABLE')) {
      showError(
        code.includes('_TIMEOUT_')
          ? t('sources.fileSourceTimeoutError')
          : t('sources.fileSourceServiceBusyError'),
      );
      return;
    }
    switch (code) {
      case 'INVALID_FILE_TYPE':
      case 'UNSUPPORTED_FILE_TYPE':
        showError(t('sources.invalidFileTypeError'));
        break;
      case 'EMPTY_FILE_DATA':
        showError(t('sources.fileSourceEmptyDataError'));
        break;
      case 'FILE_TOO_LARGE':
        showError(tooLargeMessage(t, metadata));
        break;
      case 'TOO_MANY_PAGES':
        showError(t('sources.fileSourceTooManyPagesError'));
        break;
      case 'UNPROCESSABLE_DOCUMENT':
      case 'UNPROCESSABLE_SPREADSHEET':
        showError(t('sources.fileSourceUnreadableError'));
        break;
      case 'SOURCE_LIMIT_EXCEEDED':
        showError(t('sources.sourceLimitExceededError'));
        break;
      case 'NO_PERMITTED_EMBEDDING_MODEL':
        showError(t('sources.noEmbeddingModelError'));
        break;
      case 'SERVICE_BUSY':
      case 'STORAGE_UNAVAILABLE':
        showError(t('sources.fileSourceServiceBusyError'));
        break;
      case 'SERVICE_TIMEOUT':
      case 'SPREADSHEET_PARSE_TIMEOUT':
        showError(t('sources.fileSourceTimeoutError'));
        break;
      default:
        showError(t('sources.failedToAdd'));
    }
  } catch {
    showError(t('sources.failedToAdd'));
  }
}
