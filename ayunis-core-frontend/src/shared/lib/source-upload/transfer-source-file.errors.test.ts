import { AxiosError, AxiosHeaders } from 'axios';
import type { TFunction } from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { transferSourceFile } from './transfer-source-file';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';

const mocks = vi.hoisted(() => ({ sign: vi.fn(), showError: vi.fn() }));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  sourceUploadsControllerSign: mocks.sign,
}));
vi.mock('@/shared/lib/toast', () => ({ showError: mocks.showError }));
const t = ((key: string) => key) as TFunction;

class StorageRequest {
  status = 200;
  statusText = 'OK';
  responseText = '';
  upload = {};
  onload?: () => void;
  private method = '';

  open(method: string) {
    this.method = method;
  }
  setRequestHeader() {
    return undefined;
  }
  getResponseHeader() {
    return '"part-etag"';
  }
  abort() {
    return undefined;
  }
  send() {
    this.responseText =
      this.method === 'POST'
        ? '<InitiateMultipartUploadResult><UploadId>multipart-1</UploadId></InitiateMultipartUploadResult>'
        : '';
    queueMicrotask(() => this.onload?.());
  }
}

describe('real Uppy signing errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([
    [404, 'SOURCE_UPLOAD_NOT_FOUND', false],
    [410, 'SOURCE_UPLOAD_EXPIRED', false],
    [404, 'SOURCE_UPLOAD_NOT_FOUND', true],
    [410, 'SOURCE_UPLOAD_EXPIRED', true],
  ] as const)(
    'preserves %s %s for multipart=%s through transfer and toast mapping',
    async (status, code, multipart) => {
      const original = new AxiosError('Upload session unavailable');
      // In a browser axios always attaches the XHR; Uppy keys its rewrapping on it.
      original.request = new XMLHttpRequest();
      original.response = {
        status,
        statusText: 'Unavailable',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { code },
      };
      mocks.sign.mockRejectedValue(original);
      const outcome = transferSourceFile({
        file: new File(['Budget'], 'Budget.pdf', { type: 'application/pdf' }),
        session: {
          id: 'upload-1',
          multipart,
          partSizeBytes: 8 * 1024 * 1024,
          expiresAt: '2026-11-05T20:00:00Z',
        },
      }).catch((error) => error as unknown);
      await vi.runAllTimersAsync();
      const error = await outcome;
      expect(error).toBe(original);
      handleSourceUploadError(error, t);
      expect(mocks.showError).toHaveBeenCalledWith(
        'sources.uploadInterruptedError',
      );
    },
  );
  it.each([
    [404, 'SOURCE_UPLOAD_NOT_FOUND'],
    [410, 'SOURCE_UPLOAD_EXPIRED'],
  ] as const)(
    'preserves %s %s when a later multipart part cannot be signed',
    async (status, code) => {
      const original = new AxiosError('Upload session unavailable');
      // In a browser axios always attaches the XHR; Uppy keys its rewrapping on it.
      original.request = new XMLHttpRequest();
      original.response = {
        status,
        statusText: 'Unavailable',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { code },
      };
      mocks.sign.mockImplementation(
        async (_id, request: { method: string; partNumber?: number }) => {
          if (request.method === 'PUT' && request.partNumber === 2)
            throw original;
          return { url: 'https://storage.example.test/upload' };
        },
      );
      vi.stubGlobal('XMLHttpRequest', StorageRequest);
      const outcome = transferSourceFile({
        file: new File([new Uint8Array(8 * 1024 * 1024 + 1)], 'Budget.pdf', {
          type: 'application/pdf',
        }),
        session: {
          id: 'upload-1',
          multipart: true,
          partSizeBytes: 8 * 1024 * 1024,
          expiresAt: '2026-11-05T20:00:00Z',
        },
      }).catch((error) => error as unknown);
      await vi.runAllTimersAsync();
      const error = await outcome;
      expect(error).toBe(original);
      expect(mocks.sign).toHaveBeenCalledWith(
        'upload-1',
        expect.objectContaining({
          method: 'PUT',
          uploadId: 'multipart-1',
          partNumber: 2,
        }),
        undefined,
      );
      handleSourceUploadError(error, t);
      expect(mocks.showError).toHaveBeenCalledWith(
        'sources.uploadInterruptedError',
      );
    },
  );
});
