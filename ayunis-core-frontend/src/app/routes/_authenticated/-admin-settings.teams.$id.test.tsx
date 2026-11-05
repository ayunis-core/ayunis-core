import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTeam: vi.fn(),
  listMembers: vi.fn(),
}));

vi.mock('@/pages/admin-settings/team-detail', () => ({
  TeamDetailPage: () => null,
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getTeamsControllerGetTeamQueryKey: (id: string) => ['teams', id],
  getTeamMembersControllerListTeamMembersQueryKey: (
    id: string,
    pagination: { limit: number; offset: number },
  ) => ['teams', id, 'members', pagination],
  teamsControllerGetTeam: mocks.getTeam,
  teamMembersControllerListTeamMembers: mocks.listMembers,
}));

const { Route } = await import('./admin-settings.teams.$id');

function runLoader(page: number) {
  const loader = Route.options.loader as (args: {
    deps: { page?: number };
    context: { queryClient: QueryClient };
    params: { id: string };
  }) => Promise<unknown>;

  return loader({
    deps: { page },
    context: { queryClient: new QueryClient() },
    params: { id: 'team-id' },
  });
}

describe('team detail route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTeam.mockResolvedValue({ id: 'team-id' });
    mocks.listMembers.mockResolvedValue({
      data: [],
      pagination: { limit: 50, offset: 0, total: 111 },
    });
  });

  it('loads the requested member page instead of always loading the first 50', async () => {
    await runLoader(3);

    expect(mocks.listMembers).toHaveBeenCalledWith('team-id', {
      limit: 50,
      offset: 100,
    });
  });

  it('returns to the last populated page when a deletion empties the current page', async () => {
    mocks.listMembers.mockResolvedValue({
      data: [],
      pagination: { limit: 50, offset: 100, total: 100 },
    });

    try {
      await runLoader(3);
      expect.unreachable('Expected the loader to redirect');
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect(
        (error as { options: { search: { page: number } } }).options.search,
      ).toEqual({ page: 2 });
    }
  });
});
