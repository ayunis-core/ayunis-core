import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import EditSkillWidget from '@/pages/chat/ui/chat-widgets/EditSkillWidget';

const { updateSkill, threadWorkspace } = vi.hoisted(() => ({
  updateSkill: vi.fn(),
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

function skill(id: string, name: string) {
  return {
    id,
    name,
    shortDescription: `${name} trigger`,
    instructions: `${name} instructions`,
  };
}

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  skillsControllerUpdate: updateSkill,
  getSkillsControllerFindAllQueryKey: (params: unknown) => ['/skills', params],
  getSkillsControllerFindOneQueryKey: (id: string) => [`/skills/${id}`],
  useSkillsControllerFindAll: (params: { ownerType: string }) => ({
    data: {
      data:
        params.ownerType === 'workspace'
          ? [skill('workspace-skill-id', 'Protokoll')]
          : [skill('personal-skill-id', 'Notizen')],
    },
  }),
}));

function makeContent(skillSlug: string): ToolUseMessageContent {
  return {
    type: 'tool_use',
    id: 'tc-1',
    name: 'edit_skill',
    params: {
      skill_slug: skillSlug,
      name: '',
      short_description: '',
      instructions: 'Updated instructions',
      change_summary: 'Sharper trigger',
    },
  } as unknown as ToolUseMessageContent;
}

function renderWidget(skillSlug: string) {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  render(
    <EditSkillWidget content={makeContent(skillSlug)} threadId="thread-id" />,
    { wrapper },
  );
  return { invalidateQueries };
}

describe('EditSkillWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateSkill.mockResolvedValue(undefined);
    threadWorkspace.id = null;
  });

  it('resolves a workspace skill from the thread workspace (AYC-939)', async () => {
    threadWorkspace.id = 'workspace-id';
    const { invalidateQueries } = renderWidget('workspace__protokoll');

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
  });

  it('still resolves personal skills inside a workspace thread', async () => {
    threadWorkspace.id = 'workspace-id';
    const { invalidateQueries } = renderWidget('user__notizen');

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
});
