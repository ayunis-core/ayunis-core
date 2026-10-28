import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BulkInviteResultsContent from './BulkInviteResultsContent';

const translations: Record<string, string> = {
  'bulkInvite.succeeded': 'erfolgreich',
  'bulkInvite.failed': 'fehlgeschlagen',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}));

describe(BulkInviteResultsContent.name, () => {
  it('renders localized success and failure labels', () => {
    render(
      <BulkInviteResultsContent
        results={{
          totalCount: 3,
          successCount: 2,
          failureCount: 1,
          results: [
            {
              email: 'failed@example.com',
              role: 'user',
              success: false,
              url: null,
              errorCode: 'TEAM_NOT_FOUND',
              errorMessage: 'Team not found',
            },
          ],
        }}
        hasUrls={false}
        onDownloadUrls={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('erfolgreich')).toBeTruthy();
    expect(screen.getByText('fehlgeschlagen')).toBeTruthy();
    expect(screen.queryByText('succeeded')).toBeNull();
    expect(screen.queryByText('failed')).toBeNull();
  });
});
