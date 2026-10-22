import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLinkedWorkspaces } from '@/features/workspace-links/api/useLinkedWorkspaces';
import { LinkedWorkspacesSection } from './LinkedWorkspacesSection';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { count?: number }) =>
      values?.count === undefined ? key : `${key}:${values.count}`,
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

vi.mock('@/features/workspace-links/api/useLinkedWorkspaces', () => ({
  useLinkedWorkspaces: vi.fn(),
}));

const linkedWorkspaces = vi.mocked(useLinkedWorkspaces);
const bauamt = {
  id: 'bauamt',
  name: 'Bauamt',
  icon: 'building-2',
  color: '#2563eb',
  linkedBy: null,
};

afterEach(cleanup);

describe('LinkedWorkspacesSection', () => {
  it('stays hidden when the item is not linked anywhere', () => {
    linkedWorkspaces.mockReturnValue({
      total: 0,
      workspaces: [],
      isKnown: true,
    });
    render(<LinkedWorkspacesSection kind="skill" id="skill-1" />);

    expect(screen.queryByTestId('linked-workspaces')).toBeNull();
  });

  it('counts workspaces the viewer cannot open', () => {
    linkedWorkspaces.mockReturnValue({
      total: 3,
      workspaces: [bauamt],
      isKnown: true,
    });
    render(<LinkedWorkspacesSection kind="skill" id="skill-1" />);

    expect(screen.getByText('Bauamt')).toBeTruthy();
    expect(screen.getByTestId('linked-workspaces-hidden').textContent).toBe(
      'links.linkedWorkspaces.hidden:2',
    );
  });

  it('shows the section when every link is in a workspace the viewer cannot open', () => {
    linkedWorkspaces.mockReturnValue({
      total: 1,
      workspaces: [],
      isKnown: true,
    });
    render(<LinkedWorkspacesSection kind="knowledgeBase" id="kb-1" />);

    expect(screen.getByTestId('linked-workspaces')).toBeTruthy();
    expect(screen.getByTestId('linked-workspaces-hidden').textContent).toBe(
      'links.linkedWorkspaces.hiddenOnly:1',
    );
  });
});
