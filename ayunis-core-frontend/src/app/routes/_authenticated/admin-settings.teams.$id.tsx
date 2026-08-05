import { createFileRoute } from '@tanstack/react-router';
import { TeamDetailPage } from '@/pages/admin-settings/team-detail';
import { createAuthorization } from '@/features/permissions';
import { MeResponseDtoRole } from '@/shared/api';
import {
  teamsControllerGetTeam,
  getTeamsControllerGetTeamQueryKey,
  teamsControllerListTeamMembers,
  getTeamsControllerListTeamMembersQueryKey,
  teamPermittedModelsControllerListTeamPermittedModels,
  getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey,
  usageControllerGetCreditUsage,
  getUsageControllerGetCreditUsageQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/teams/$id',
)({
  component: RouteComponent,
  loader: async ({ context: { user, queryClient }, params: { id } }) => {
    // Both feed admin-only tabs behind admin-only endpoints; prefetching them
    // for a manager who reached this page via a teams permission only 403s.
    const authorization = createAuthorization(user.role);
    if (authorization.hasRole(MeResponseDtoRole.admin)) {
      void queryClient.prefetchQuery({
        queryKey:
          getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey(id),
        queryFn: () => teamPermittedModelsControllerListTeamPermittedModels(id),
      });

      void queryClient.prefetchQuery({
        queryKey: getUsageControllerGetCreditUsageQueryKey(),
        queryFn: () => usageControllerGetCreditUsage(),
      });
    }

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
