import { act, renderHook } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDownloadMemberCertificate } from './useDownloadMemberCertificate';

const { getCertificate, showError, saveBlobAs } = vi.hoisted(() => ({
  getCertificate: vi.fn(),
  showError: vi.fn(),
  saveBlobAs: vi.fn(),
}));

vi.mock('@/shared/api', () => ({
  academyAccessControllerGetOrgMemberCertificate: getCertificate,
}));
vi.mock('@/shared/lib/save-blob-as', () => ({ saveBlobAs }));
vi.mock('@/shared/lib/toast', () => ({ showError }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function blobError(status: number, body: string): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', undefined, config, undefined, {
    status,
    statusText: '',
    headers: {},
    config,
    data: new Blob([body], { type: 'application/json' }),
  });
}

describe('useDownloadMemberCertificate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the not-completed message when the error body arrives as a blob', async () => {
    getCertificate.mockRejectedValue(
      blobError(404, JSON.stringify({ code: 'COMPLETION_NOT_FOUND' })),
    );
    const { result } = renderHook(() => useDownloadMemberCertificate());

    await act(() => result.current.downloadCertificate('user-id'));

    expect(showError).toHaveBeenCalledWith('overview.certificate.notCompleted');
  });

  it('falls back to the generic message for a non-JSON blob body', async () => {
    getCertificate.mockRejectedValue(blobError(500, 'oops'));
    const { result } = renderHook(() => useDownloadMemberCertificate());

    await act(() => result.current.downloadCertificate('user-id'));

    expect(showError).toHaveBeenCalledWith('overview.certificate.error');
  });
  it('saves the PDF and resets pending state after success', async () => {
    const pdf = new Blob(['%PDF'], { type: 'application/pdf' });
    let resolve!: (data: Blob) => void;
    getCertificate.mockReturnValue(
      new Promise<Blob>((done) => {
        resolve = done;
      }),
    );
    const { result } = renderHook(() => useDownloadMemberCertificate());
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.downloadCertificate('anna');
    });
    expect(result.current.downloadingUserId).toBe('anna');
    await act(async () => {
      resolve(pdf);
      await pending;
    });
    expect(saveBlobAs).toHaveBeenCalledWith(
      pdf,
      'Teilnahmebestaetigung_Ayunis_Core_KI-Schulung.pdf',
    );
    expect(result.current.downloadingUserId).toBeNull();
  });

  it('rejects overlapping downloads even before React renders the pending state', async () => {
    let resolve!: (data: Blob) => void;
    getCertificate.mockReturnValue(
      new Promise<Blob>((done) => {
        resolve = done;
      }),
    );
    const { result } = renderHook(() => useDownloadMemberCertificate());
    await act(async () => {
      const first = result.current.downloadCertificate('anna');
      void result.current.downloadCertificate('bruno');
      resolve(new Blob(['%PDF']));
      await first;
    });
    expect(getCertificate).toHaveBeenCalledTimes(1);
  });

  it('shows a rate-limit message and clears pending state after failure', async () => {
    getCertificate.mockRejectedValue(blobError(429, '{}'));
    const { result } = renderHook(() => useDownloadMemberCertificate());
    await act(() => result.current.downloadCertificate('anna'));
    expect(showError).toHaveBeenCalledWith('overview.certificate.rateLimited');
    expect(result.current.downloadingUserId).toBeNull();
  });
});
