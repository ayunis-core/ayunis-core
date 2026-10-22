import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findWorkspace: vi.fn(),
  findSkill: vi.fn(),
  isEmbeddingModelEnabled: vi.fn(),
}));

vi.mock('@/pages/workspace/ui/WorkspaceSkillDetailPage', () => ({
  WorkspaceSkillDetailPage: () => null,
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getModelsControllerIsEmbeddingModelEnabledQueryKey: () => [
    '/models/embedding/enabled',
  ],
  getSkillsControllerFindOneQueryKey: (id: string) => [`/skills/${id}`],
  getWorkspacesControllerFindOneQueryKey: (id: string) => [`/workspaces/${id}`],
  modelsControllerIsEmbeddingModelEnabled: mocks.isEmbeddingModelEnabled,
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
    mocks.isEmbeddingModelEnabled.mockResolvedValue({
      isEmbeddingModelEnabled: true,
    });
  });

  it('loads the canonical entity-id skill endpoint', async () => {
    await expect(runLoader()).resolves.toMatchObject({
      skill: { id: 'skill' },
    });
    expect(mocks.findSkill).toHaveBeenCalledWith('skill');
  });

  it('rejects a skill persisted under another workspace', async () => {
    mocks.findSkill.mockResolvedValue({
      id: 'skill',
      ownerType: 'workspace',
      workspaceId: 'workspace-b',
    });

    await expect(runLoader('workspace-a')).rejects.toBeDefined();
  });

  it('rejects a personal skill on a workspace route', async () => {
    mocks.findSkill.mockResolvedValue({
      id: 'skill',
      ownerType: 'personal',
    });

    await expect(runLoader()).rejects.toBeDefined();
  });
});
