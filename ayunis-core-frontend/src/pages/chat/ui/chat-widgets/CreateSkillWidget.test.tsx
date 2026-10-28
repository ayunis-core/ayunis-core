import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import CreateSkillWidget from '@/pages/chat/ui/chat-widgets/CreateSkillWidget';

const { createSkill, threadWorkspace } = vi.hoisted(() => ({
  createSkill: vi.fn(),
  threadWorkspace: { id: null as string | null },
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

vi.mock('@/shared/api', () => ({
  skillsControllerCreate: createSkill,
  getSkillsControllerFindAllQueryKey: (params: unknown) => ['/skills', params],
  getThreadAiContextControllerGetAiContextQueryKey: (id: string) => [
    `/threads/${id}/ai-context`,
  ],
  getWorkspaceContextControllerFindContextQueryKey: (id: string) => [
    `/workspaces/${id}/context`,
  ],
}));

function makeContent(): ToolUseMessageContent {
  return {
    type: 'tool_use',
    id: 'tc-1',
    name: 'create_skill',
    params: {
      name: 'Protokoll',
      short_description: 'Writes minutes',
      instructions: 'Summarise the meeting',
    },
  } as unknown as ToolUseMessageContent;
}

function renderWidget() {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  render(<CreateSkillWidget content={makeContent()} threadId="thread-id" />, {
    wrapper,
  });
  return { invalidateQueries };
}

describe('CreateSkillWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSkill.mockResolvedValue({ id: 'skill-id' });
    threadWorkspace.id = null;
  });

  it('creates a personal skill when the thread has no workspace', async () => {
    const { invalidateQueries } = renderWidget();

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(createSkill).toHaveBeenCalled());
    expect(createSkill).toHaveBeenCalledWith(
      expect.objectContaining({ ownerType: 'personal' }),
    );
    expect(createSkill.mock.calls[0][0]).not.toHaveProperty('workspaceId');
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['/skills', { ownerType: 'personal' }],
      }),
    );
  });

  it('creates the skill in the thread workspace (AYC-939)', async () => {
    threadWorkspace.id = 'workspace-id';
    const { invalidateQueries } = renderWidget();

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(createSkill).toHaveBeenCalled());
    expect(createSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerType: 'workspace',
        workspaceId: 'workspace-id',
      }),
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
  });
});
