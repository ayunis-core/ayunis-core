import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CertificateOverviewCard } from './CertificateOverviewCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/widgets/pagination', () => ({ SearchPagination: () => null }));
vi.mock('./CertificateOverviewFilters', () => ({
  CertificateOverviewFilters: () => null,
}));
vi.mock('./CertificateOverviewTable', () => ({
  CertificateOverviewTable: () => null,
}));
vi.mock(
  '@/pages/admin-settings/academy-settings/api/useExportCertificateOverview',
  () => ({
    useExportCertificateOverview: () => ({
      exportOverview: vi.fn(),
      isExporting: false,
    }),
  }),
);
vi.mock(
  '@/pages/admin-settings/academy-settings/api/useDownloadMemberCertificate',
  () => ({
    useDownloadMemberCertificate: () => ({
      downloadCertificate: vi.fn(),
      downloadingUserId: null,
    }),
  }),
);

describe('CertificateOverviewCard', () => {
  afterEach(cleanup);
  it.each([0, 15])(
    'uses the filtered total %i to enable export on an empty page',
    (total) => {
      render(
        <CertificateOverviewCard
          entries={[]}
          pagination={{ total, limit: 10, offset: 100 }}
          mode="required_once"
          currentPage={11}
        />,
      );
      expect(
        screen.getByTestId('academy-overview-export').hasAttribute('disabled'),
      ).toBe(total === 0);
    },
  );
});
