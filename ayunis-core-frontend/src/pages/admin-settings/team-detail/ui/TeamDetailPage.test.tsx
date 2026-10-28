import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamDetailPage } from './TeamDetailPage';

const state = vi.hoisted(() => ({ isAdmin: true }));
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
  useAuthorization: () => ({ hasRole: () => state.isAdmin }),
  PermissionGate: ({ children }: { children: ReactNode }) => children,
}));
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
