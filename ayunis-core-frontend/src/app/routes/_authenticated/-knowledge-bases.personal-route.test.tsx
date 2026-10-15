import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findKnowledgeBase: vi.fn(),
}));

vi.mock('@/pages/knowledge-base', () => ({
  KnowledgeBasePage: () => null,
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getKnowledgeBasesControllerFindOneQueryKey: (id: string) => [
    `/knowledge-bases/${id}`,
  ],
  knowledgeBasesControllerFindOne: mocks.findKnowledgeBase,
}));

const { Route } = await import('./knowledge-bases.$id');

function runLoader() {
  const loader = Route.options.loader as (args: {
    context: { queryClient: QueryClient };
    params: { id: string };
  }) => Promise<unknown>;
  return loader({
    context: { queryClient: new QueryClient() },
    params: { id: 'knowledge-base' },
  });
}

describe('personal knowledge-base detail route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findKnowledgeBase.mockResolvedValue({
      id: 'knowledge-base',
      ownerType: 'personal',
    });
  });

  it('loads a personal knowledge base', async () => {
    await expect(runLoader()).resolves.toEqual({
      knowledgeBase: { id: 'knowledge-base', ownerType: 'personal' },
    });
  });

  it('redirects workspace knowledge bases to their workspace', async () => {
    mocks.findKnowledgeBase.mockResolvedValue({
      id: 'knowledge-base',
      ownerType: 'workspace',
      workspaceId: 'workspace',
    });

    await expect(runLoader()).rejects.toMatchObject({
      options: {
        to: '/workspaces/$workspaceId/knowledge-bases/$knowledgeBaseId',
        params: { workspaceId: 'workspace', knowledgeBaseId: 'knowledge-base' },
      },
    });
  });
});
