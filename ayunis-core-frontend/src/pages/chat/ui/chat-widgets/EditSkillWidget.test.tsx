import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import EditSkillWidget from '@/pages/chat/ui/chat-widgets/EditSkillWidget';

const { findSkill, updateSkill, threadWorkspace, detailQueryState } =
  vi.hoisted(() => ({
    findSkill: vi.fn(),
    updateSkill: vi.fn(),
    threadWorkspace: { id: null as string | null },
    detailQueryState: { isPending: false, isFetched: true },
  }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/lib/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@/pages/chat/api/useThreadWorkspaceId', () => ({
  useThreadWorkspaceId: () => threadWorkspace.id,
}));

function skill(id: string, name: string) {
  return {
    id,
    name,
    shortDescription: `${name} trigger`,
    instructions: `${name} instructions`,
  };
}

vi.mock('@/shared/api', () => ({
  skillsControllerUpdate: updateSkill,
  getSkillsControllerFindAllQueryKey: (params: unknown) => ['/skills', params],
  getSkillsControllerFindOneQueryKey: (id: string) => [`/skills/${id}`],
  getThreadAiContextControllerGetAiContextQueryKey: (id: string) => [
    `/threads/${id}/ai-context`,
  ],
  getWorkspaceContextControllerFindContextQueryKey: (id: string) => [
    `/workspaces/${id}/context`,
  ],
  useSkillsControllerFindOne: (id: string) => ({
    data: id ? findSkill(id) : undefined,
    ...detailQueryState,
  }),
  useSkillsControllerFindAll: (params: { ownerType: string }) => ({
    data: {
      data:
        params.ownerType === 'workspace'
          ? [skill('workspace-skill-id', 'Protokoll')]
          : [skill('personal-skill-id', 'Notizen')],
    },
    isPending: false,
    isFetched: true,
  }),
}));

function makeContent(
  skillSlug: string,
  skillId?: string,
): ToolUseMessageContent {
  return {
    type: 'tool_use',
    id: 'tc-1',
    name: 'edit_skill',
    params: {
      skill_slug: skillSlug,
      ...(skillId ? { skill_id: skillId } : {}),
      name: '',
      short_description: '',
      instructions: 'Updated instructions',
      change_summary: 'Sharper trigger',
    },
  } as unknown as ToolUseMessageContent;
}

function renderWidget(
  skillSlug: string,
  skillId?: string,
  isStreaming = false,
) {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  render(
    <EditSkillWidget
      content={makeContent(skillSlug, skillId)}
      threadId="thread-id"
      isStreaming={isStreaming}
    />,
    { wrapper },
  );
  return { invalidateQueries, queryClient };
}

describe('EditSkillWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateSkill.mockImplementation((id: string) =>
      Promise.resolve({
        ...skill(id, id === 'workspace-skill-id' ? 'Protokoll' : 'Notizen'),
        ownerType: id === 'workspace-skill-id' ? 'workspace' : 'personal',
        ...(id === 'workspace-skill-id' ? { workspaceId: 'workspace-id' } : {}),
      }),
    );
    findSkill.mockImplementation((id: string) => ({
      ...skill(id, id === 'workspace-skill-id' ? 'Protokoll' : 'Notizen'),
      ownerType: id === 'workspace-skill-id' ? 'workspace' : 'personal',
      ...(id === 'workspace-skill-id' ? { workspaceId: 'workspace-id' } : {}),
    }));
    threadWorkspace.id = null;
    detailQueryState.isPending = false;
    detailQueryState.isFetched = true;
  });

  it('updates the immutable workspace skill id (AYC-939)', async () => {
    threadWorkspace.id = 'workspace-id';
    const { invalidateQueries, queryClient } = renderWidget(
      'workspace__protokoll',
      'workspace-skill-id',
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(updateSkill).toHaveBeenCalled());
    expect(updateSkill).toHaveBeenCalledWith(
      'workspace-skill-id',
      expect.objectContaining({ name: 'Protokoll' }),
    );
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          '/skills',
          { ownerType: 'workspace', workspaceId: 'workspace-id' },
        ],
      }),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['/threads/thread-id/ai-context'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['/workspaces/workspace-id/context'],
    });
    expect(queryClient.getQueryData(['/skills/workspace-skill-id'])).toEqual(
      expect.objectContaining({ id: 'workspace-skill-id' }),
    );
  });

  it('still updates personal skills inside a workspace thread', async () => {
    threadWorkspace.id = 'workspace-id';
    const { invalidateQueries } = renderWidget(
      'user__notizen',
      'personal-skill-id',
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(updateSkill).toHaveBeenCalled());
    expect(updateSkill).toHaveBeenCalledWith(
      'personal-skill-id',
      expect.objectContaining({ name: 'Notizen' }),
    );
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['/skills', { ownerType: 'personal' }],
      }),
    );
  });

  it('refuses a workspace edit after the thread moves to another workspace', async () => {
    threadWorkspace.id = 'other-workspace-id';
    renderWidget('workspace__protokoll', 'workspace-skill-id');

    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveProperty('disabled', true),
    );
    expect(updateSkill).not.toHaveBeenCalled();
  });

  it('does not resolve a legacy workspace slug against personal skills', async () => {
    threadWorkspace.id = null;
    renderWidget('workspace__notizen');

    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveProperty('disabled', true),
    );
    expect(updateSkill).not.toHaveBeenCalled();
  });

  it('does not report an ID-backed skill as missing while it loads', () => {
    detailQueryState.isPending = true;
    detailQueryState.isFetched = false;
    findSkill.mockReturnValue(undefined);

    renderWidget('user__notizen', 'personal-skill-id');

    expect(
      screen.queryByText('chat.tools.edit_skill.skillNotFound'),
    ).toBeNull();
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
  });

  it('does not report a workspace skill as missing before its ID streams', () => {
    renderWidget('workspace__protokoll', undefined, true);

    expect(
      screen.queryByText('chat.tools.edit_skill.skillNotFound'),
    ).toBeNull();
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
  });
});
