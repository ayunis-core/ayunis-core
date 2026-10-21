import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import {
  TeamDetailPage,
  TeamForbiddenPage,
  TEAM_MEMBERS_PER_PAGE,
} from '@/pages/admin-settings/team-detail';
import {
  teamsControllerGetTeam,
  getTeamsControllerGetTeamQueryKey,
  teamMembersControllerListTeamMembers,
  getTeamMembersControllerListTeamMembersQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { isForbiddenError } from '@/shared/api/is-forbidden-error';

const searchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute(
  '/_authenticated/admin-settings/teams/$id',
)({
  validateSearch: searchSchema,
  loaderDeps: ({ search: { page } }) => ({ page: page ?? 1 }),
  component: RouteComponent,
  loader: async ({
    context: { queryClient },
    params: { id },
    deps: { page },
  }) => {
    const membersParams = {
      limit: TEAM_MEMBERS_PER_PAGE,
      offset: (page - 1) * TEAM_MEMBERS_PER_PAGE,
    };
    try {
      const [team, membersResponse] = await Promise.all([
        queryClient.query({
          queryKey: getTeamsControllerGetTeamQueryKey(id),
          queryFn: () => teamsControllerGetTeam(id),
        }),
        queryClient.query({
          queryKey: getTeamMembersControllerListTeamMembersQueryKey(
            id,
            membersParams,
          ),
          queryFn: () =>
            teamMembersControllerListTeamMembers(id, membersParams),
        }),
      ]);
      const total = membersResponse.pagination.total ?? 0;
      if (membersResponse.data.length === 0 && page > 1 && total > 0) {
        throw redirect({
          to: '/admin-settings/teams/$id',
          params: { id },
          search: { page: Math.ceil(total / TEAM_MEMBERS_PER_PAGE) },
        });
      }
      return { access: 'granted' as const, team, membersResponse, page };
    } catch (error) {
      if (!isForbiddenError(error)) throw error;
      return { access: 'forbidden' as const };
    }
  },
});

function RouteComponent() {
  const data = Route.useLoaderData();
  if (data.access === 'forbidden') return <TeamForbiddenPage />;
  return (
    <TeamDetailPage
      team={data.team}
      membersResponse={data.membersResponse}
      page={data.page}
    />
  );
}
