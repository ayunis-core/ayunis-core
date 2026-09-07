import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SidebarMenuGroup } from '@/widgets/settings-sidebar/ui/SettingsSidebarWidget';
import { AdminSettingsSidebar } from './AdminSettingsSidebar';

const state = vi.hoisted(() => ({ isAdmin: true, hasBudget: true }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/features/feature-toggles', () => ({
  useIsLetterheadsEnabled: () => false,
}));
vi.mock('@/features/academy', () => ({ useIsAcademyAddonActive: () => false }));
vi.mock('@/features/credit-limits', () => ({
  useHasCreditBudget: (enabled: boolean) => enabled && state.hasBudget,
}));
vi.mock('@/features/permissions', () => ({
  useAuthorization: () => ({ hasRole: () => state.isAdmin }),
  allowedSettingsSections: () =>
    state.isAdmin ? ['/admin-settings'] : ['/admin-settings/teams'],
}));
vi.mock('@/widgets/settings-sidebar/ui/SettingsSidebarWidget', () => ({
  SettingsSidebarWidget: ({ groups }: { groups: SidebarMenuGroup[] }) => (
    <nav>
      {groups.flatMap((group) =>
        group.items.map((item) => (
          <a key={item.to} href={item.to}>
            {item.label}
          </a>
        )),
      )}
    </nav>
  ),
}));

afterEach(cleanup);
beforeEach(() => {
  state.isAdmin = true;
  state.hasBudget = true;
});

describe('credit limits navigation', () => {
  it('has a dedicated credit limits entry for usage-based administrators', () => {
    render(<AdminSettingsSidebar />);
    expect(
      screen
        .getByRole('link', { name: 'layout.creditLimits' })
        .getAttribute('href'),
    ).toBe('/admin-settings/credit-limits');
  });

  it('does not advertise credit limits to a seat-based organization', () => {
    state.hasBudget = false;
    render(<AdminSettingsSidebar />);
    expect(
      screen.queryByRole('link', { name: 'layout.creditLimits' }),
    ).toBeNull();
  });

  it('keeps policy settings hidden from a manager with team permissions', () => {
    state.isAdmin = false;
    render(<AdminSettingsSidebar />);
    expect(screen.getByRole('link', { name: 'layout.teams' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'layout.models' })).toBeNull();
    expect(
      screen.queryByRole('link', { name: 'layout.creditLimits' }),
    ).toBeNull();
  });
});
