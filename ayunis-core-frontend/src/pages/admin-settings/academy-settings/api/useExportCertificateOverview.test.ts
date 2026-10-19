import { AxiosError } from 'axios';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useExportCertificateOverview } from './useExportCertificateOverview';

const { exportCsv, saveBlobAs, showError } = vi.hoisted(() => ({
  exportCsv: vi.fn(),
  saveBlobAs: vi.fn(),
  showError: vi.fn(),
}));
vi.mock('@/shared/api', () => ({
  academyAccessControllerExportOrgCertificates: exportCsv,
}));
vi.mock('@/shared/lib/save-blob-as', () => ({ saveBlobAs }));
vi.mock('@/shared/lib/toast', () => ({ showError }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === 'overview.export.fileName'
        ? 'Localized_training_status.csv'
        : key,
  }),
}));

describe('useExportCertificateOverview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exports the active filters, saves the CSV, and clears pending state', async () => {
    const csv = new Blob(['Name'], { type: 'text/csv' });
    let resolve!: (data: Blob) => void;
    exportCsv.mockReturnValue(
      new Promise<Blob>((done) => {
        resolve = done;
      }),
    );
    const { result } = renderHook(() =>
      useExportCertificateOverview({ search: 'anna', status: 'expired' }),
    );
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.exportOverview();
      void result.current.exportOverview();
    });
    expect(result.current.isExporting).toBe(true);
    expect(exportCsv).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve(csv);
      await pending;
    });
    expect(exportCsv).toHaveBeenCalledWith({
      search: 'anna',
      status: 'expired',
    });
    expect(saveBlobAs).toHaveBeenCalledWith(
      csv,
      'Localized_training_status.csv',
    );
    expect(result.current.isExporting).toBe(false);
  });

  it('reports a failure and clears pending state without downloading', async () => {
    exportCsv.mockRejectedValue(new Error('network unavailable'));
    const { result } = renderHook(() => useExportCertificateOverview({}));
    await act(() => result.current.exportOverview());
    expect(showError).toHaveBeenCalledWith('overview.export.error');
    expect(saveBlobAs).not.toHaveBeenCalled();
    expect(result.current.isExporting).toBe(false);
  });
  it('explains an exhausted export quota and clears pending state', async () => {
    const error = new AxiosError('Too many exports');
    error.response = {
      status: 429,
      data: new Blob(['{}']),
      headers: {},
    } as AxiosError['response'];
    exportCsv.mockRejectedValue(error);
    const { result } = renderHook(() => useExportCertificateOverview({}));
    await act(() => result.current.exportOverview());
    expect(showError).toHaveBeenCalledWith('overview.export.rateLimited');
    expect(saveBlobAs).not.toHaveBeenCalled();
    expect(result.current.isExporting).toBe(false);
  });
});
