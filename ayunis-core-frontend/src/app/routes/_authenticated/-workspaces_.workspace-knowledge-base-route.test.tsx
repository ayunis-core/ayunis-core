import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findWorkspace: vi.fn(),
  findKnowledgeBase: vi.fn(),
  listDocuments: vi.fn(),
}));

vi.mock('@/pages/workspace/ui/WorkspaceKnowledgeBaseDetailPage', () => ({
  WorkspaceKnowledgeBaseDetailPage: () => null,
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getKnowledgeBasesControllerFindOneQueryKey: (id: string) => [
    `/knowledge-bases/${id}`,
  ],
  getKnowledgeBasesControllerListDocumentsQueryKey: (id: string) => [
    `/knowledge-bases/${id}/documents`,
  ],
  getWorkspacesControllerFindOneQueryKey: (id: string) => [`/workspaces/${id}`],
  knowledgeBasesControllerFindOne: mocks.findKnowledgeBase,
  knowledgeBasesControllerListDocuments: mocks.listDocuments,
  workspacesControllerFindOne: mocks.findWorkspace,
}));

const { Route } =
  await import('./workspaces_.$workspaceId.knowledge-bases.$knowledgeBaseId');

function runLoader(workspaceId = 'workspace-a') {
  const loader = Route.options.loader as (args: {
    context: { queryClient: QueryClient };
    params: { workspaceId: string; knowledgeBaseId: string };
  }) => Promise<unknown>;
  return loader({
    context: { queryClient: new QueryClient() },
    params: { workspaceId, knowledgeBaseId: 'knowledge' },
  });
}

describe('workspace knowledge-base detail route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findWorkspace.mockResolvedValue({
      id: 'workspace-a',
      name: 'Workspace A',
    });
    mocks.findKnowledgeBase.mockResolvedValue({
      id: 'knowledge',
      ownerType: 'workspace',
      workspaceId: 'workspace-a',
    });
    mocks.listDocuments.mockResolvedValue({ data: [] });
  });

  it('loads canonical entity-id detail and document endpoints', async () => {
    await expect(runLoader()).resolves.toMatchObject({
      knowledgeBase: { id: 'knowledge' },
      documents: { data: [] },
    });
    expect(mocks.findKnowledgeBase).toHaveBeenCalledWith('knowledge');
    expect(mocks.listDocuments).toHaveBeenCalledWith('knowledge');
  });

  it('rejects a knowledge base persisted under another workspace', async () => {
    mocks.findKnowledgeBase.mockResolvedValue({
      id: 'knowledge',
      ownerType: 'workspace',
      workspaceId: 'workspace-b',
    });

    await expect(runLoader('workspace-a')).rejects.toBeDefined();
    expect(mocks.listDocuments).not.toHaveBeenCalled();
  });
});
