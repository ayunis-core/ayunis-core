import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamDetailPage } from './TeamDetailPage';

const state = vi.hoisted(() => ({
  isAdmin: true,
  granted: [] as string[],
  teamAdminOf: [] as string[],
  teamAdminRights: ['team_manage_members', 'team_appoint_admins'] as string[],
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/pages/admin-settings/admin-settings-layout', () => ({
  default: ({
    children,
    action,
  }: {
    children: ReactNode;
    action: ReactNode;
  }) => (
    <>
      {action}
      {children}
    </>
  ),
}));
vi.mock('@/features/permissions', () => ({
  useAuthorization: () => ({
    hasRole: () => state.isAdmin,
    can: (permission: string) =>
      state.isAdmin || state.granted.includes(permission),
    teamAdminCan: (teamId: string, permission: string) =>
      state.teamAdminOf.includes(teamId) &&
      state.teamAdminRights.includes(permission),
  }),
}));
vi.mock('@/widgets/pagination', () => ({ PaginationWidget: () => null }));
vi.mock('@/features/credit-limits', () => ({
  useHasCreditBudget: (enabled: boolean) => enabled,
}));
vi.mock('@/widgets/onboarding', () => ({
  OnboardingTourTarget: ({ children }: { children: ReactNode }) => children,
  TOUR_TARGET: {},
}));
vi.mock('./TeamMembersList', () => ({
  TeamMembersList: () => <p>Team members</p>,
}));
vi.mock('./AddTeamMemberDialog', () => ({ AddTeamMemberDialog: () => null }));
vi.mock('./TeamCreditLimitCard', () => ({
  TeamCreditLimitCard: () => <button>Credit limit</button>,
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
    ...rest
  }: {
    to: string;
    params: { id: string };
    children: ReactNode;
  }) => (
    <a href={to.replace('$id', params.id)} {...rest}>
      {children}
    </a>
  ),
}));

const props = {
  team: {
    id: 'team-id',
    name: 'Finance',
    orgId: 'org-id',
    createdAt: '',
    updatedAt: '',
    modelOverrideEnabled: false,
  },
  membersResponse: { data: [], pagination: { limit: 50, offset: 0, total: 0 } },
};
afterEach(cleanup);
beforeEach(() => {
  state.isAdmin = true;
  state.granted = [];
  state.teamAdminOf = [];
  state.teamAdminRights = ['team_manage_members', 'team_appoint_admins'];
});

describe('team policy shortcuts', () => {
  it('links to centralized policies instead of exposing policy tabs', () => {
    render(<TeamDetailPage {...props} />);
    expect(screen.getByTestId('team-manage-models').getAttribute('href')).toBe(
      '/admin-settings/models/teams/team-id',
    );
    expect(screen.getByRole('button', { name: 'Credit limit' })).toBeTruthy();
    expect(screen.queryByTestId('team-models-tab')).toBeNull();
    expect(screen.getByText('Team members')).toBeTruthy();
  });

  it('keeps membership management but hides policy links for non-admins', () => {
    state.isAdmin = false;
    render(<TeamDetailPage {...props} />);
    expect(screen.getByText('Team members')).toBeTruthy();
    expect(screen.queryByTestId('team-manage-models')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Credit limit' })).toBeNull();
  });
});

describe('team admin access', () => {
  it('lets a team admin of this team add members', () => {
    state.isAdmin = false;
    state.teamAdminOf = ['team-id'];
    render(<TeamDetailPage {...props} />);
    expect(screen.getByTestId('team-members-add')).toBeTruthy();
  });

  it('hides adding members from team admins without the right', () => {
    state.isAdmin = false;
    state.teamAdminOf = ['team-id'];
    state.teamAdminRights = ['team_appoint_admins'];
    render(<TeamDetailPage {...props} />);
    expect(screen.queryByTestId('team-members-add')).toBeNull();
  });

  it('hides adding members from viewers who may only see the team', () => {
    state.isAdmin = false;
    state.granted = ['manage_teams'];
    render(<TeamDetailPage {...props} />);
    expect(screen.queryByTestId('team-members-add')).toBeNull();
  });
});

vi.mock('@/features/permissions/api/useTeamManagementAccess', () => ({
  useTeamManagementAccess: () => ({ canManageTeams: true, isLoading: false }),
}));
