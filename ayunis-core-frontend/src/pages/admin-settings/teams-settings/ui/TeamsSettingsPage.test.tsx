import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { getMyPermissionsControllerGetMineQueryKey } from '@/shared/api';
import { TeamsSettingsPage } from './TeamsSettingsPage';
import type { Team } from '@/pages/admin-settings/teams-settings/model/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { names?: string }) =>
      options?.names ? `${key}:${options.names}` : key,
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: ReactNode;
    to: string;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/permissions', () => ({
  PermissionGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../../admin-settings-layout', () => ({
  default: ({
    children,
    action,
    title,
  }: {
    children: ReactNode;
    action: ReactNode;
    title: string;
  }) => (
    <section>
      <h1>{title}</h1>
      {action}
      {children}
    </section>
  ),
}));

vi.mock('@/shared/ui/help-link/HelpLink', () => ({
  HelpLink: () => <a href="/help">Help</a>,
}));

vi.mock('./CreateTeamDialog', () => ({
  CreateTeamDialog: () => null,
}));

vi.mock('./EditTeamDialog', () => ({
  EditTeamDialog: () => null,
}));

vi.mock('../api/useDeleteTeam', () => ({
  useDeleteTeam: () => ({
    deleteTeam: vi.fn(),
    isDeleting: false,
  }),
}));

const createTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 'team-1',
  name: 'City Services',
  orgId: 'org-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  modelOverrideEnabled: false,
  ...overrides,
});

function renderTeamsSettingsPage(teams: Team[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(getMyPermissionsControllerGetMineQueryKey(), {
    permissions: ['manage_teams'],
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TeamsSettingsPage teams={teams} />
    </QueryClientProvider>,
  );
}

describe('TeamsSettingsPage', () => {
  it('shows only the create-first-team empty state when there are no teams', () => {
    renderTeamsSettingsPage([]);

    expect(
      screen.queryByPlaceholderText('teams.filters.searchPlaceholder'),
    ).toBeNull();
    expect(screen.getByText('teams.list.emptyTitle')).toBeTruthy();
  });

  it('shows the filters and list when teams exist', () => {
    renderTeamsSettingsPage([createTeam()]);

    expect(
      screen.getByPlaceholderText('teams.filters.searchPlaceholder'),
    ).toBeTruthy();
    expect(screen.getByText('City Services')).toBeTruthy();
  });

  it('names the team admins below each team', () => {
    renderTeamsSettingsPage([
      createTeam({
        teamAdmins: [
          { userId: 'user-1', name: 'Jonas Weber' },
          { userId: 'user-2', name: 'Lena Hoffmann' },
        ],
      }),
      createTeam({ id: 'team-2', name: 'Bauamt', teamAdmins: [] }),
    ]);

    expect(screen.getByTestId('team-admins-team-1').textContent).toBe(
      'teams.list.admins:Jonas Weber, Lena Hoffmann',
    );
    expect(screen.getByTestId('team-admins-team-2').textContent).toBe(
      'teams.list.noAdmins',
    );
  });

  it('explains that only admins and team admins manage teams when access is gone', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <TeamsSettingsPage teams={[]} forbidden />
      </QueryClientProvider>,
    );

    expect(screen.getByText('teams.list.forbiddenTitle')).toBeTruthy();
    expect(screen.queryByText('teams.list.emptyTitle')).toBeNull();
  });

  it('shows the no-matches empty state when a search has no team matches', () => {
    renderTeamsSettingsPage([createTeam()]);

    fireEvent.change(
      screen.getByPlaceholderText('teams.filters.searchPlaceholder'),
      {
        target: { value: 'missing' },
      },
    );

    expect(screen.getByText('teams.list.noMatchesTitle')).toBeTruthy();
    expect(screen.queryByText('City Services')).toBeNull();
  });
});
