import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  TeamDetail,
  TeamMember,
} from '@/pages/admin-settings/team-detail/model/types';
import { TeamMembersList, type TeamMemberRights } from './TeamMembersList';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/pages/admin-settings/team-detail/api/useRemoveTeamMember', () => ({
  useRemoveTeamMember: () => ({
    removeTeamMember: vi.fn(),
    removingUserIds: new Set<string>(),
  }),
}));
vi.mock('@/pages/admin-settings/team-detail/api/useSetTeamAdmin', () => ({
  useSetTeamAdmin: () => ({ setTeamAdmin: vi.fn(), isSettingTeamAdmin: false }),
}));
vi.mock('@ayunis/ui/components/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
}));

afterEach(cleanup);

const member = (userId: string, isTeamAdmin = false): TeamMember => ({
  id: `member-${userId}`,
  userId,
  userName: userId,
  userEmail: `${userId}@example.org`,
  userRole: 'user',
  isTeamAdmin,
  joinedAt: '2026-01-01T00:00:00.000Z',
});

const team = (adminIds: string[]): TeamDetail => ({
  id: 'team-1',
  name: 'Bauamt',
  orgId: 'org-1',
  createdAt: '',
  updatedAt: '',
  modelOverrideEnabled: false,
  teamAdmins: adminIds.map((userId) => ({ userId, name: userId })),
});

const teamAdminRights: TeamMemberRights = {
  canAppoint: true,
  canManageMembers: true,
  isAdminViewer: false,
};

function renderList(adminIds: string[], rights = teamAdminRights) {
  render(
    <TeamMembersList
      team={team(adminIds)}
      members={[member('jonas', adminIds.includes('jonas')), member('lena')]}
      rights={rights}
    />,
  );
}

describe('TeamMembersList', () => {
  it('lets team admins change roles and remove members', () => {
    renderList(['jonas', 'lena']);

    expect(
      screen.getByTestId('team-member-role-lena').getAttribute('role'),
    ).toBe('combobox');
    expect(screen.getByTestId('team-member-remove-lena')).toBeTruthy();
  });

  it('protects the only team admin from non-admin viewers', () => {
    renderList(['jonas']);

    expect(screen.getByTestId('team-member-role-jonas').tagName).toBe('SPAN');
    expect(screen.queryByTestId('team-member-remove-jonas')).toBeNull();
    expect(screen.getByTestId('team-member-remove-lena')).toBeTruthy();
  });

  it('lets organization admins change the only team admin', () => {
    renderList(['jonas'], { ...teamAdminRights, isAdminViewer: true });

    expect(
      screen.getByTestId('team-member-role-jonas').getAttribute('role'),
    ).toBe('combobox');
    expect(screen.getByTestId('team-member-remove-jonas')).toBeTruthy();
  });

  it('shows a read-only list without rights', () => {
    renderList(['jonas'], {
      ...teamAdminRights,
      canAppoint: false,
      canManageMembers: false,
    });

    expect(screen.getByTestId('team-member-role-lena').tagName).toBe('SPAN');
    expect(screen.queryByTestId('team-member-remove-lena')).toBeNull();
  });
});
