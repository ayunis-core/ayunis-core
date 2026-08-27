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
export default function handleSourceUploadError(
  error: unknown,
  t: TFunction,
): void {
  try {
    const { code } = extractErrorData(error);
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
        showError(t('sources.fileSourceTooLargeError'));
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
