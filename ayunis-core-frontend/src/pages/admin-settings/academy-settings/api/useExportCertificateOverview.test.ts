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
  useTranslation: () => ({ t: (key: string) => key }),
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
    });
    expect(result.current.isExporting).toBe(true);
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
      'Schulungsstatus_Ayunis_Core_KI-Schulung.csv',
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
});
