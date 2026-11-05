import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Permissions from '@/features/permissions';
import type { AppPermission, TeamAccess } from '@/features/permissions';
import type { TeamMember } from '@/pages/admin-settings/team-detail/model/types';
import { TeamMembersList } from './TeamMembersList';

const state = vi.hoisted(() => ({
  teams: [] as TeamAccess[],
  permissions: [] as AppPermission[],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/features/permissions', async (importOriginal) => {
  const actual = await importOriginal<typeof Permissions>();
  return {
    ...actual,
    useAuthorization: () => ({
      ...actual.createAuthorization('user', state.permissions, state.teams),
      isLoading: false,
    }),
  };
});
vi.mock('@/pages/admin-settings/team-detail/api/useRemoveTeamMember', () => ({
  useRemoveTeamMember: () => ({
    removeTeamMember: vi.fn(),
    removingUserIds: new Set(),
  }),
}));
vi.mock('./TeamMemberRoleSelect', () => ({
  TeamMemberRoleSelect: ({ member }: { member: TeamMember }) => (
    <span data-testid={`team-member-role-${member.userId}`} />
  ),
}));

const member = (userId: string, role: TeamMember['role']): TeamMember => ({
  id: `member-${userId}`,
  userId,
  userName: userId,
  userEmail: `${userId}@example.gov`,
  userRole: 'user',
  role,
  joinedAt: '2026-01-01T00:00:00.000Z',
});
const members = [member('lead', 'admin'), member('colleague', 'user')];

afterEach(cleanup);
beforeEach(() => {
  state.teams = [];
  state.permissions = [];
});

describe('TeamMembersList', () => {
  it('lets a team admin change roles and remove any member', () => {
    state.teams = [
      {
        id: 'team-id',
        role: 'admin',
        permissions: ['assign_users_to_teams'],
      },
    ];

    render(<TeamMembersList teamId="team-id" members={members} />);

    expect(screen.getByTestId('team-member-role-lead')).toBeTruthy();
    expect(screen.getByTestId('team-member-remove-lead')).toBeTruthy();
    expect(screen.getByTestId('team-member-remove-colleague')).toBeTruthy();
  });

  it('lets a team manager remove ordinary members only, without role changes', () => {
    state.teams = [
      {
        id: 'team-id',
        role: 'manager',
        permissions: ['assign_users_to_teams'],
      },
    ];

    render(<TeamMembersList teamId="team-id" members={members} />);

    expect(screen.queryByTestId('team-member-role-lead')).toBeNull();
    expect(screen.getByText('teamDetail.memberRole.roles.admin')).toBeTruthy();
    expect(screen.queryByTestId('team-member-remove-lead')).toBeNull();
    expect(screen.getByTestId('team-member-remove-colleague')).toBeTruthy();
  });

  it('shows roles read-only to members without team management', () => {
    state.teams = [
      { id: 'team-id', role: 'user', permissions: ['manage_teams'] },
    ];

    render(<TeamMembersList teamId="team-id" members={members} />);

    expect(screen.queryByTestId('team-member-role-colleague')).toBeNull();
    expect(screen.queryByTestId('team-member-remove-colleague')).toBeNull();
  });
});
