import { createFileRoute } from '@tanstack/react-router';
import { TeamDetailPage } from '@/pages/admin-settings/team-detail';
import {
  teamsControllerGetTeam,
  getTeamsControllerGetTeamQueryKey,
  teamMembersControllerListTeamMembers,
  getTeamMembersControllerListTeamMembersQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/teams/$id',
)({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const [team, membersResponse] = await Promise.all([
      queryClient.query({
        queryKey: getTeamsControllerGetTeamQueryKey(id),
        queryFn: () => teamsControllerGetTeam(id),
      }),
      queryClient.query({
        queryKey: getTeamMembersControllerListTeamMembersQueryKey(id, {
          limit: 50,
          offset: 0,
        }),
        queryFn: () =>
          teamMembersControllerListTeamMembers(id, { limit: 50, offset: 0 }),
      }),
    ]);
    return { team, membersResponse };
  },
});

function RouteComponent() {
  const { team, membersResponse } = Route.useLoaderData();
  return <TeamDetailPage team={team} membersResponse={membersResponse} />;
}
