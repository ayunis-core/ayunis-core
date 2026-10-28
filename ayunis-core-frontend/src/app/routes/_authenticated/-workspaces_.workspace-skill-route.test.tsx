import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findWorkspace: vi.fn(),
  findSkill: vi.fn(),
  listKnowledgeBases: vi.fn(),
  isEmbeddingModelEnabled: vi.fn(),
}));

vi.mock('@/pages/workspace/ui/WorkspaceSkillDetailPage', () => ({
  WorkspaceSkillDetailPage: () => null,
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getModelsControllerIsEmbeddingModelEnabledQueryKey: () => [
    '/models/embedding/enabled',
  ],
  getSkillKnowledgeBasesControllerListSkillKnowledgeBasesQueryKey: (
    id: string,
  ) => [`/skills/${id}/knowledge-bases`],
  getSkillsControllerFindOneQueryKey: (id: string) => [`/skills/${id}`],
  getWorkspacesControllerFindOneQueryKey: (id: string) => [`/workspaces/${id}`],
  modelsControllerIsEmbeddingModelEnabled: mocks.isEmbeddingModelEnabled,
  skillKnowledgeBasesControllerListSkillKnowledgeBases:
    mocks.listKnowledgeBases,
  skillsControllerFindOne: mocks.findSkill,
  workspacesControllerFindOne: mocks.findWorkspace,
}));

const { Route } = await import('./workspaces_.$workspaceId.skills.$skillId');

function runLoader(workspaceId = 'workspace-a') {
  const loader = Route.options.loader as (args: {
    context: { queryClient: QueryClient };
    params: { workspaceId: string; skillId: string };
  }) => Promise<unknown>;
  return loader({
    context: { queryClient: new QueryClient() },
    params: { workspaceId, skillId: 'skill' },
  });
}

describe('workspace skill detail route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findWorkspace.mockResolvedValue({
      id: 'workspace-a',
      name: 'Workspace A',
    });
    mocks.findSkill.mockResolvedValue({
      id: 'skill',
      ownerType: 'workspace',
      workspaceId: 'workspace-a',
    });
    mocks.listKnowledgeBases.mockResolvedValue([{ id: 'knowledge' }]);
    mocks.isEmbeddingModelEnabled.mockResolvedValue({
      isEmbeddingModelEnabled: true,
    });
  });

  it('loads canonical entity-id skill and knowledge-base endpoints', async () => {
    await expect(runLoader()).resolves.toMatchObject({
      skill: { id: 'skill' },
      assignedKnowledgeBaseIds: ['knowledge'],
    });
    expect(mocks.findSkill).toHaveBeenCalledWith('skill');
    expect(mocks.listKnowledgeBases).toHaveBeenCalledWith('skill');
  });

  it('rejects a skill persisted under another workspace', async () => {
    mocks.findSkill.mockResolvedValue({
      id: 'skill',
      ownerType: 'workspace',
      workspaceId: 'workspace-b',
    });

    await expect(runLoader('workspace-a')).rejects.toBeDefined();
    expect(mocks.listKnowledgeBases).not.toHaveBeenCalled();
  });

  it('rejects a personal skill on a workspace route', async () => {
    mocks.findSkill.mockResolvedValue({
      id: 'skill',
      ownerType: 'personal',
    });

    await expect(runLoader()).rejects.toBeDefined();
    expect(mocks.listKnowledgeBases).not.toHaveBeenCalled();
  });
});
