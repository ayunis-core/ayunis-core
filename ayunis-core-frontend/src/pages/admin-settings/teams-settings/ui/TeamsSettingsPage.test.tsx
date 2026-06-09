import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { TeamsSettingsPage } from './TeamsSettingsPage';
import type { Team } from '../model/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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

describe('TeamsSettingsPage', () => {
  it('shows only the create-first-team empty state when there are no teams', () => {
    render(<TeamsSettingsPage teams={[]} />);

    expect(
      screen.queryByPlaceholderText('teams.filters.searchPlaceholder'),
    ).toBeNull();
    expect(screen.getByText('teams.list.emptyTitle')).toBeTruthy();
  });

  it('shows the filters and list when teams exist', () => {
    render(<TeamsSettingsPage teams={[createTeam()]} />);

    expect(
      screen.getByPlaceholderText('teams.filters.searchPlaceholder'),
    ).toBeTruthy();
    expect(screen.getByText('City Services')).toBeTruthy();
  });
});
