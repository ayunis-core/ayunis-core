import { createFileRoute } from '@tanstack/react-router';
import { TeamDetailPage } from '@/pages/admin-settings/team-detail';
import {
  teamsControllerGetTeam,
  getTeamsControllerGetTeamQueryKey,
  teamsControllerListTeamMembers,
  getTeamsControllerListTeamMembersQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/teams/$id',
)({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const [team, membersResponse] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: getTeamsControllerGetTeamQueryKey(id),
        queryFn: () => teamsControllerGetTeam(id),
      }),
      queryClient.fetchQuery({
        queryKey: getTeamsControllerListTeamMembersQueryKey(id, {
          limit: 50,
          offset: 0,
        }),
        queryFn: () =>
          teamsControllerListTeamMembers(id, { limit: 50, offset: 0 }),
      }),
    ]);
    return { team, membersResponse };
  },
});

function RouteComponent() {
  const { team, membersResponse } = Route.useLoaderData();
  return <TeamDetailPage team={team} membersResponse={membersResponse} />;
}
