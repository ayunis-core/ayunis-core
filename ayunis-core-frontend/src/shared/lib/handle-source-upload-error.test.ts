import type { TFunction } from 'i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import handleSourceUploadError from './handle-source-upload-error';

const { extractErrorData, showError } = vi.hoisted(() => ({
  extractErrorData: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@/shared/api/extract-error-data', () => ({
  default: extractErrorData,
}));
vi.mock('@/shared/lib/toast', () => ({ showError }));

const t = vi.fn((key: string, options?: { max?: number }) =>
  options?.max === undefined ? key : `${key}:${options.max}`,
) as unknown as TFunction;

describe('handleSourceUploadError', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the unreadable-file message for malformed spreadsheets', () => {
    extractErrorData.mockReturnValue({ code: 'UNPROCESSABLE_SPREADSHEET' });

    handleSourceUploadError(new Error('upload failed'), t);

    expect(showError).toHaveBeenCalledWith('sources.fileSourceUnreadableError');
  });

  it('shows the service-busy message when object storage is temporarily unavailable', () => {
    extractErrorData.mockReturnValue({ code: 'STORAGE_UNAVAILABLE' });

    handleSourceUploadError(new Error('upload failed'), t);

    expect(showError).toHaveBeenCalledWith(
      'sources.fileSourceServiceBusyError',
    );
  });

  it('shows the size-less too-large message for a 413 without an error code', () => {
    extractErrorData.mockReturnValue({ code: 'UNKNOWN_ERROR', status: 413 });

    handleSourceUploadError(new Error('upload failed'), t);

    expect(showError).toHaveBeenCalledWith(
      'sources.fileSourceTooLargeUnknownLimitError',
    );
  });

  it('shows the organization limit from the 413 payload when a file is too large', () => {
    extractErrorData.mockReturnValue({
      code: 'FILE_TOO_LARGE',
      status: 413,
      metadata: { maxFileSizeBytes: 50 * 1024 * 1024 },
    });

    handleSourceUploadError(new Error('upload failed'), t);

    expect(t).toHaveBeenCalledWith('sources.fileSourceTooLargeError', {
      max: 50,
    });
    expect(showError).toHaveBeenCalledWith(
      'sources.fileSourceTooLargeError:50',
    );
  });

  it('shows the size-less too-large message when the rejection carries no limit', () => {
    extractErrorData.mockReturnValue({ code: 'FILE_TOO_LARGE', status: 413 });

    handleSourceUploadError(new Error('upload failed'), t);

    expect(showError).toHaveBeenCalledWith(
      'sources.fileSourceTooLargeUnknownLimitError',
    );
  });
});
