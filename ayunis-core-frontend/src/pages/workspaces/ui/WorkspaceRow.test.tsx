import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Workspace } from '@/features/workspaces';
import { WorkspaceRow } from './WorkspaceRow';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock('./WorkspacePinButton', () => ({
  WorkspacePinButton: () => null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count === undefined ? key : `${key}:${options.count}`,
  }),
}));

function aWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: 'workspace-id',
    name: 'Design System',
    description: 'Test',
    instruction: null,
    icon: 'folder',
    color: 'violet',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    accessLevel: 'owner',
    memberCount: 1,
    skillCount: 0,
    knowledgeBaseCount: 0,
    ...overrides,
  };
}

describe('WorkspaceRow', () => {
  it('lists skills and members without chats or the description', () => {
    render(
      <WorkspaceRow
        workspace={aWorkspace({ skillCount: 1, memberCount: 4 })}
      />,
    );

    expect(
      screen.getByText('page.skillCount:1 · page.memberCount:4'),
    ).toBeTruthy();
    expect(screen.queryByText(/Chat/)).toBeNull();
    expect(screen.queryByText(/Test/)).toBeNull();
  });

  it('says what the viewer may do in the workspace', () => {
    render(<WorkspaceRow workspace={aWorkspace({ accessLevel: 'edit' })} />);

    expect(
      screen.getByTestId('workspace-access-workspace-id').textContent,
    ).toBe('viewer.edit');
  });
});
