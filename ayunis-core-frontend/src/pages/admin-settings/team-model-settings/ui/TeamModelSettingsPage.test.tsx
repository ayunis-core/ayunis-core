import { render, screen } from '@testing-library/react';
import { defaultParseSearch } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { TeamResponseDto } from '@/shared/api';
import TeamModelSettingsPage from './TeamModelSettingsPage';

vi.mock('@/pages/admin-settings/admin-settings-layout', () => ({
  default: ({
    children,
    breadcrumbs,
  }: {
    children: ReactNode;
    breadcrumbs: { label: string; href?: string }[];
  }) => (
    <>
      {breadcrumbs.map((crumb) => (
        <a key={crumb.label} href={crumb.href}>
          {crumb.label}
        </a>
      ))}
      {children}
    </>
  ),
}));
vi.mock('./TeamModelsTab', () => ({
  TeamModelsTab: () => <div data-testid="team-model-controls" />,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
const team: TeamResponseDto = {
  id: 'team',
  name: 'Planning',
  orgId: 'org',
  createdAt: '',
  updatedAt: '',
  modelOverrideEnabled: false,
};

function expectBreadcrumbSearch(label: string, tab: string, search: string) {
  const href = screen.getByText(label).getAttribute('href') ?? '';
  const url = new URL(href, 'https://ayunis.example');
  expect(url.pathname).toBe('/admin-settings/models');
  expect(defaultParseSearch(url.search)).toEqual({ tab, search });
}

describe(TeamModelSettingsPage.name, () => {
  it.each(['123', 'true', 'null', '{"name":"Planning"}', '[1,2]'])(
    'preserves %s as a string through the router breadcrumb roundtrip',
    (search) => {
      render(<TeamModelSettingsPage team={team} search={search} />);
      expectBreadcrumbSearch('layout.models', 'organization', search);
      expectBreadcrumbSearch('tabs.teams', 'teams', search);
    },
  );
  it('links Models to organization and Teams to the preserved search, ending with the team name', () => {
    render(<TeamModelSettingsPage team={team} search="Plan & build" />);
    expectBreadcrumbSearch('layout.models', 'organization', 'Plan & build');
    expectBreadcrumbSearch('tabs.teams', 'teams', 'Plan & build');
    expect(screen.getByText('Planning').getAttribute('href')).toBeNull();
    expect(screen.queryByText('layout.title')).toBeNull();
    expect(screen.getByTestId('team-model-controls')).toBeTruthy();
    expect(screen.queryByText('teamPolicy.unionDescription')).toBeNull();
  });
});
