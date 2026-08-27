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

const t = ((key: string) => key) as TFunction;

describe('handleSourceUploadError', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the unreadable-file message for malformed spreadsheets', () => {
    extractErrorData.mockReturnValue({ code: 'UNPROCESSABLE_SPREADSHEET' });

    handleSourceUploadError(new Error('upload failed'), t);

    expect(showError).toHaveBeenCalledWith('sources.fileSourceUnreadableError');
  });
});
