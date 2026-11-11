import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findKnowledgeBase: vi.fn(),
  listTeams: vi.fn(),
  getPermissions: vi.fn(),
}));

vi.mock('@/pages/knowledge-base', () => ({
  KnowledgeBasePage: () => null,
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getKnowledgeBasesControllerFindOneQueryKey: (id: string) => [
    `/knowledge-bases/${id}`,
  ],
  getTeamsControllerListMyTeamsQueryKey: () => ['teams'],
  getMyPermissionsControllerGetMineQueryKey: () => ['permissions'],
  myPermissionsControllerGetMine: mocks.getPermissions,
  knowledgeBasesControllerFindOne: mocks.findKnowledgeBase,
  teamsControllerListMyTeams: mocks.listTeams,
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
    mocks.listTeams.mockResolvedValue([]);
    mocks.getPermissions.mockResolvedValue({ permissions: [] });
  });

  it('redirects workspace knowledge bases before loading ownership context', async () => {
    mocks.findKnowledgeBase.mockResolvedValue({
      id: 'knowledge-base',
      ownerType: 'workspace',
      workspaceId: 'workspace',
    });

    await expect(runLoader()).rejects.toBeDefined();
    expect(mocks.listTeams).not.toHaveBeenCalled();
  });

  it.each(['personal', 'team', 'org'])(
    'loads teams and permissions for a %s knowledge base so managers never see it read-only',
    async (ownerType) => {
      mocks.findKnowledgeBase.mockResolvedValue({
        id: 'knowledge-base',
        ownerType,
        teamId: ownerType === 'team' ? 'team' : undefined,
      });

      await expect(runLoader()).resolves.toMatchObject({
        knowledgeBase: { ownerType },
      });
      expect(mocks.listTeams).toHaveBeenCalled();
      expect(mocks.getPermissions).toHaveBeenCalled();
    },
  );
});
