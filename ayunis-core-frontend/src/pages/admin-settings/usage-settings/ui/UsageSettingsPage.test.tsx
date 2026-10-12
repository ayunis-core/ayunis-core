import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import UsageSettingsPage from './UsageSettingsPage';
const { config } = vi.hoisted(() => ({
  config: {
    data: { hideIndividualUsage: false },
    isFetching: true,
    isFetchedAfterMount: true,
    isError: false,
  },
}));
vi.mock('@/pages/admin-settings/usage-settings/api/useUsageConfig', () => ({
  useUsageConfig: () => config,
}));
vi.mock(
  '@/pages/admin-settings/usage-settings/lib/useOwnOrgUsageHooks',
  () => ({ ownOrgUsageHooks: {} }),
);
vi.mock('@/pages/admin-settings/admin-settings-layout', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/widgets/usage-overview', () => ({
  UsageOverview: ({ showIndividualUsage }: { showIndividualUsage: boolean }) =>
    showIndividualUsage ? <div data-testid="user-section" /> : null,
}));
afterEach(cleanup);
it('keeps the section mounted during background policy refreshes after an initial verified read', () => {
  render(<UsageSettingsPage />);
  expect(screen.getByTestId('user-section')).toBeTruthy();
});
it('does not show cached usage before the current mount verifies privacy', () => {
  config.isFetchedAfterMount = false;
  render(<UsageSettingsPage />);
  expect(screen.queryByTestId('user-section')).toBeNull();
});
