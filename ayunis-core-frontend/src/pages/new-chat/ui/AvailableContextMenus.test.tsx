import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailableContextMenus } from './AvailableContextMenus';

const mocks = vi.hoisted(() => ({
  personalSkills: [] as Array<Record<string, unknown>>,
  personalKnowledge: [] as Array<Record<string, unknown>>,
  workspaceSkills: [] as Array<Record<string, unknown>>,
  workspaceKnowledge: [] as Array<Record<string, unknown>>,
  skillsEnabled: true,
  knowledgeEnabled: true,
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useSkillsControllerFindAll: () => ({ data: { data: mocks.personalSkills } }),
  useKnowledgeBasesControllerFindAll: () => ({
    data: { data: mocks.personalKnowledge },
  }),
  useWorkspaceContextControllerFindContext: (workspaceId: string) => ({
    data: workspaceId
      ? {
          skills: mocks.workspaceSkills,
          knowledgeBases: mocks.workspaceKnowledge,
        }
      : undefined,
  }),
}));

vi.mock('@/shared/api/skill-scopes', () => ({ personalSkillListParams: {} }));
vi.mock('@/shared/api/knowledge-base-scopes', () => ({
  personalKnowledgeBaseListParams: {},
}));

vi.mock('@/features/feature-toggles', () => ({
  useIsSkillsEnabled: () => mocks.skillsEnabled,
  useIsKnowledgeBasesEnabled: () => mocks.knowledgeEnabled,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      if (key.endsWith('Count')) return `${options?.count}`;
      return key;
    },
  }),
}));

function anEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a',
    name: 'Fristenprüfung',
    isActive: true,
    isShared: false,
    ...overrides,
  };
}

describe('AvailableContextMenus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.skillsEnabled = true;
    mocks.knowledgeEnabled = true;
    mocks.personalSkills = [anEntry()];
    mocks.personalKnowledge = [anEntry({ id: 'kb', name: 'Satzungen' })];
    mocks.workspaceSkills = [];
    mocks.workspaceKnowledge = [];
  });

  afterEach(cleanup);

  it('counts skills and knowledge side by side', () => {
    render(<AvailableContextMenus workspaceId={null} />);

    expect(screen.getByTestId('available-skills-menu').textContent).toContain(
      '1',
    );
    expect(
      screen.getByTestId('available-knowledge-menu').textContent,
    ).toContain('1');
  });

  it('adds what the picked workspace brings along', () => {
    mocks.workspaceSkills = [
      anEntry({ id: 'ws-1', name: 'Vorprüfung' }),
      anEntry({ id: 'ws-2', name: 'Denkmalschutz' }),
    ];
    mocks.workspaceKnowledge = [anEntry({ id: 'ws-kb', name: 'Bauakten' })];

    render(<AvailableContextMenus workspaceId="workspace-a" />);

    expect(screen.getByTestId('available-skills-menu').textContent).toContain(
      '3',
    );
    expect(
      screen.getByTestId('available-knowledge-menu').textContent,
    ).toContain('2');
  });

  it('marks only what someone else made available', () => {
    mocks.personalSkills = [
      anEntry(),
      anEntry({ id: 'b', name: 'Aktenplan', isShared: true }),
    ];
    mocks.workspaceSkills = [anEntry({ id: 'ws-1', name: 'Vorprüfung' })];

    render(<AvailableContextMenus workspaceId="workspace-a" />);
    fireEvent.click(screen.getByTestId('available-skills-menu'));

    expect(screen.getByTestId('available-skills-a').textContent).toBe(
      'Fristenprüfung',
    );
    expect(screen.getByTestId('available-skills-b').textContent).toContain(
      'availableContext.sharedBadge',
    );
    expect(screen.getByTestId('available-skills-ws-1').textContent).toContain(
      'availableContext.sharedBadge',
    );
  });

  it('counts a skill once when the workspace also carries it', () => {
    mocks.personalSkills = [anEntry({ id: 'shared-one' })];
    mocks.workspaceSkills = [anEntry({ id: 'shared-one' })];

    render(<AvailableContextMenus workspaceId="workspace-a" />);

    expect(screen.getByTestId('available-skills-menu').textContent).toContain(
      '1',
    );
  });

  it('says that skills switch themselves on', () => {
    render(<AvailableContextMenus workspaceId={null} />);
    fireEvent.click(screen.getByTestId('available-skills-menu'));

    expect(screen.getByText('availableContext.skillsHint')).toBeTruthy();
  });

  it('leaves inactive skills out of the count', () => {
    mocks.personalSkills = [anEntry(), anEntry({ id: 'b', isActive: false })];

    render(<AvailableContextMenus workspaceId={null} />);

    expect(screen.getByTestId('available-skills-menu').textContent).toContain(
      '1',
    );
  });

  it('shows only what the organisation has switched on', () => {
    mocks.knowledgeEnabled = false;

    render(<AvailableContextMenus workspaceId={null} />);

    expect(screen.getByTestId('available-skills-menu')).toBeTruthy();
    expect(screen.queryByTestId('available-knowledge-menu')).toBeNull();
  });
});
