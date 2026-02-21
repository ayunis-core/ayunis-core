import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import type { TFunction } from 'i18next';

/**
 * Shared error handler for file-source upload mutations.
 * Maps known backend error codes to user-facing toast messages.
 *
 * Works with any i18n namespace that contains the `sources.*` keys
 * (currently `agent` and `skill`).
 */
export default function handleSourceUploadError(
  error: unknown,
  t: TFunction,
): void {
  try {
    const { code } = extractErrorData(error);
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
      case 'SERVICE_BUSY':
        showError(t('sources.fileSourceServiceBusyError'));
        break;
      case 'SERVICE_TIMEOUT':
        showError(t('sources.fileSourceTimeoutError'));
        break;
      default:
        showError(t('sources.failedToAdd'));
    }
  } catch {
    showError(t('sources.failedToAdd'));
  }
}
