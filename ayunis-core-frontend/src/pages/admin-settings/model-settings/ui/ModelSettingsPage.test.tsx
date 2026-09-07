import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ModelSettingsPage from './ModelSettingsPage';

vi.mock('@/pages/admin-settings/admin-settings-layout', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/shared/ui/help-link/HelpLink', () => ({ HelpLink: () => null }));
vi.mock('./OrganizationModels', () => ({
  default: () => <div data-testid="organization-models" />,
}));
vi.mock('@/pages/admin-settings/model-settings/api/useModelTeams', () => ({
  useModelTeams: () => ({
    teams: [
      { id: 'planning', name: 'Planning', modelOverrideEnabled: true },
      { id: 'finance', name: 'Finance', modelOverrideEnabled: false },
    ],
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('@/features/models', () => ({
  useLanguageModels: () => ({ models: [], isLoading: false, isError: false }),
  useEmbeddingModels: () => ({ models: [], isLoading: false, isError: false }),
  useImageGenerationModels: () => ({
    models: [],
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('./OrgDefaultModelCard', () => ({ OrgDefaultModelCard: () => null }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: () => null,
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    search,
    children,
    ...props
  }: {
    to: string;
    params?: { id: string };
    search?: Record<string, string>;
    children: ReactNode;
  }) => (
    <a
      href={`${to.replace('$id', params?.id ?? '')}?${new URLSearchParams(search)}`}
      {...props}
    >
      {children}
    </a>
  ),
}));

describe(ModelSettingsPage.name, () => {
  it('shows organization controls without the old team settings hint', () => {
    render(
      <ModelSettingsPage
        tab="organization"
        search="Plan"
        onSearchChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('organization-models')).toBeTruthy();
    expect(screen.queryByText('organization.description')).toBeNull();
    expect(screen.queryByText('models.teamHint.title')).toBeNull();
    expect(screen.getByTestId('models-teams-tab').getAttribute('href')).toBe(
      '/admin-settings/models?tab=teams&search=Plan',
    );
  });

  it('filters team policies and preserves list state in configure links', () => {
    const onSearchChange = vi.fn();
    render(
      <ModelSettingsPage
        tab="teams"
        search=" plan "
        onSearchChange={onSearchChange}
      />,
    );
    expect(screen.getByText('Planning')).toBeTruthy();
    const card = screen.getByRole('table').closest('[data-slot="card"]');
    expect(card).not.toBeNull();
    expect(card?.querySelector('[data-slot="card-title"]')?.textContent).toBe(
      'teams.title',
    );
    expect(card?.contains(screen.getByTestId('models-team-search'))).toBe(true);
    expect(screen.queryByText('teams.description')).toBeNull();
    expect(screen.queryByText('Finance')).toBeNull();
    expect(screen.getByTestId('models-team-planning-policy').textContent).toBe(
      'teams.custom',
    );
    expect(
      screen.getByTestId('models-team-planning-configure').getAttribute('href'),
    ).toBe('/admin-settings/models/teams/planning?tab=teams&search=+plan+');
    fireEvent.change(screen.getByTestId('models-team-search'), {
      target: { value: 'Finance' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('Finance');
  });

  it('shows inherited policy and a no-match state', () => {
    const { rerender } = render(
      <ModelSettingsPage tab="teams" search="" onSearchChange={vi.fn()} />,
    );
    expect(screen.getByTestId('models-team-finance-policy').textContent).toBe(
      'teams.inherited',
    );
    rerender(
      <ModelSettingsPage
        tab="teams"
        search="missing"
        onSearchChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('models-teams-empty')).toBeTruthy();
  });
});
