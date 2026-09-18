import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Workspace } from '@/features/workspaces';
import { WorkspaceRow } from './WorkspaceRow';

const mocks = vi.hoisted(() => ({
  skillsEnabled: true,
  knowledgeBasesEnabled: true,
}));

vi.mock('@/features/feature-toggles', () => ({
  useIsSkillsEnabled: () => mocks.skillsEnabled,
  useIsKnowledgeBasesEnabled: () => mocks.knowledgeBasesEnabled,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock('./WorkspacePinButton', () => ({
  WorkspacePinButton: () => null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      const count = options?.count ?? 0;
      if (key === 'page.skillCount') {
        return `${count} ${count === 1 ? 'Fähigkeit' : 'Fähigkeiten'}`;
      }
      if (key === 'page.knowledgeBaseCount') {
        return `${count} ${count === 1 ? 'Wissenssammlung' : 'Wissenssammlungen'}`;
      }
      return key;
    },
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
    skillCount: 0,
    knowledgeBaseCount: 0,
    ...overrides,
  };
}

describe('WorkspaceRow', () => {
  beforeEach(() => {
    mocks.skillsEnabled = true;
    mocks.knowledgeBasesEnabled = true;
  });

  it('lists skills and knowledge bases without chats or the description', () => {
    render(
      <WorkspaceRow
        workspace={aWorkspace({ skillCount: 1, knowledgeBaseCount: 3 })}
      />,
    );

    expect(screen.getByText('1 Fähigkeit · 3 Wissenssammlungen')).toBeTruthy();
    expect(screen.queryByText(/Chat/)).toBeNull();
    expect(screen.queryByText(/Test/)).toBeNull();
  });

  it('keeps empty counts visible as a prompt to add resources', () => {
    render(<WorkspaceRow workspace={aWorkspace()} />);

    expect(
      screen.getByText('0 Fähigkeiten · 0 Wissenssammlungen'),
    ).toBeTruthy();
  });

  it('renders the name alone when both features are switched off', () => {
    mocks.skillsEnabled = false;
    mocks.knowledgeBasesEnabled = false;

    render(<WorkspaceRow workspace={aWorkspace()} />);

    expect(screen.getByText('Design System')).toBeTruthy();
    expect(screen.queryByText(/Fähigkeit/)).toBeNull();
    expect(screen.queryByText(/Wissenssammlung/)).toBeNull();
  });

  it('keeps only the enabled feature’s count', () => {
    mocks.skillsEnabled = false;

    render(<WorkspaceRow workspace={aWorkspace({ knowledgeBaseCount: 2 })} />);

    expect(screen.getByText('2 Wissenssammlungen')).toBeTruthy();
    expect(screen.queryByText(/Fähigkeit/)).toBeNull();
  });
});
