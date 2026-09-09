import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  featureToggles: vi.fn(),
  findKnowledgeBase: vi.fn(),
  getShares: vi.fn(),
  listTeams: vi.fn(),
}));

vi.mock('@/pages/knowledge-base', () => ({
  KnowledgeBasePage: () => null,
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  appControllerFeatureToggles: mocks.featureToggles,
  getAppControllerFeatureTogglesQueryKey: () => ['feature-toggles'],
  getKnowledgeBasesControllerFindOneQueryKey: (id: string) => [
    `/knowledge-bases/${id}`,
  ],
  getSharesControllerGetSharesQueryKey: () => ['shares'],
  getTeamsControllerListMyTeamsQueryKey: () => ['teams'],
  knowledgeBasesControllerFindOne: mocks.findKnowledgeBase,
  sharesControllerGetShares: mocks.getShares,
  teamsControllerListMyTeams: mocks.listTeams,
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI.schemas', () => ({
  CreateKnowledgeBaseShareDtoEntityType: {
    knowledge_base: 'knowledge_base',
  },
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
    mocks.featureToggles.mockResolvedValue({ knowledgeBasesEnabled: true });
    mocks.findKnowledgeBase.mockResolvedValue({
      id: 'knowledge-base',
      ownerType: 'personal',
      isShared: false,
    });
    mocks.getShares.mockResolvedValue([]);
    mocks.listTeams.mockResolvedValue([]);
  });

  it('loads sharing context for a personal knowledge base', async () => {
    await expect(runLoader()).resolves.toMatchObject({
      knowledgeBase: { ownerType: 'personal' },
      shares: [],
      userTeams: [],
    });
    expect(mocks.getShares).toHaveBeenCalled();
    expect(mocks.listTeams).toHaveBeenCalled();
  });

  it('redirects workspace knowledge bases before loading personal sharing context', async () => {
    mocks.findKnowledgeBase.mockResolvedValue({
      id: 'knowledge-base',
      ownerType: 'workspace',
      workspaceId: 'workspace',
      isShared: false,
    });

    await expect(runLoader()).rejects.toBeDefined();
    expect(mocks.getShares).not.toHaveBeenCalled();
    expect(mocks.listTeams).not.toHaveBeenCalled();
  });
});
