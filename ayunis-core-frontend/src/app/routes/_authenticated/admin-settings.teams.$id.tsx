import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { TeamDetailPage } from '@/pages/admin-settings/team-detail';
import {
  teamsControllerGetTeam,
  getTeamsControllerGetTeamQueryKey,
  teamMembersControllerListTeamMembers,
  getTeamMembersControllerListTeamMembersQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

const TEAM_MEMBERS_PER_PAGE = 50;

const searchSchema = z.object({
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute(
  '/_authenticated/admin-settings/teams/$id',
)({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  component: RouteComponent,
  loader: async ({
    deps: { page = 1 },
    context: { queryClient },
    params: { id },
  }) => {
    const offset = (page - 1) * TEAM_MEMBERS_PER_PAGE;
    const [team, membersResponse] = await Promise.all([
      queryClient.query({
        queryKey: getTeamsControllerGetTeamQueryKey(id),
        queryFn: () => teamsControllerGetTeam(id),
      }),
      queryClient.query({
        queryKey: getTeamMembersControllerListTeamMembersQueryKey(id, {
          limit: TEAM_MEMBERS_PER_PAGE,
          offset,
        }),
        queryFn: () =>
          teamMembersControllerListTeamMembers(id, {
            limit: TEAM_MEMBERS_PER_PAGE,
            offset,
          }),
      }),
    ]);
    const lastPage = Math.max(
      1,
      Math.ceil(
        (membersResponse.pagination.total ?? 0) / TEAM_MEMBERS_PER_PAGE,
      ),
    );
    if (page > lastPage) {
      throw redirect({
        to: '/admin-settings/teams/$id',
        params: { id },
        search: { page: lastPage === 1 ? undefined : lastPage },
      });
    }

    return { team, membersResponse };
  },
});

function RouteComponent() {
  const { team, membersResponse } = Route.useLoaderData();
  return <TeamDetailPage team={team} membersResponse={membersResponse} />;
}
