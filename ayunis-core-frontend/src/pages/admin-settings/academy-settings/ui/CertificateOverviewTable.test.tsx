import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CertificateOverviewTable } from './CertificateOverviewTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) =>
      `${key} ${options?.name ?? ''}`,
  }),
}));

describe('CertificateOverviewTable', () => {
  afterEach(cleanup);
  it('names the member and shows progress on the active download', () => {
    render(
      <CertificateOverviewTable
        entries={[
          {
            userId: 'anna',
            name: 'Anna Schmidt',
            email: 'anna@example.com',
            completedAt: '2026-01-15T12:00:00Z',
            expiresAt: null,
            status: 'valid',
          },
        ]}
        showRenewalColumn={false}
        onDownloadCertificate={vi.fn()}
        downloadingUserId="anna"
      />,
    );
    const button = screen.getByRole('button', { name: /Anna Schmidt/ });
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('.animate-spin')).not.toBeNull();
  });

  it('keeps the tooltip reachable while the download button is disabled', () => {
    render(
      <CertificateOverviewTable
        entries={[
          {
            userId: 'anna',
            name: 'Anna Schmidt',
            email: 'anna@example.com',
            completedAt: '2026-01-15T12:00:00Z',
            expiresAt: null,
            status: 'valid',
          },
        ]}
        showRenewalColumn={false}
        onDownloadCertificate={vi.fn()}
        downloadingUserId="anna"
      />,
    );
    const button = screen.getByRole('button', { name: /Anna Schmidt/ });
    expect(button.hasAttribute('disabled')).toBe(true);
    const trigger = button.closest('[data-slot="tooltip-trigger"]');
    expect(trigger).not.toBeNull();
    expect(trigger).not.toBe(button);
  });
});
