import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { TeamModelSettingsPage } from '@/pages/admin-settings/team-model-settings';
import { getTeamsControllerGetTeamQueryOptions } from '@/shared/api';
import { searchParamString } from '@/shared/lib/search-params';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/models/teams/$id',
)({
  component: RouteComponent,
  validateSearch: z.object({
    tab: z.literal('teams').default('teams').catch('teams'),
    search: searchParamString.default('').catch(''),
  }),
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const team = await queryClient.query(
      getTeamsControllerGetTeamQueryOptions(id),
    );
    return { team };
  },
});

function RouteComponent() {
  const { team } = Route.useLoaderData();
  const { search } = Route.useSearch();
  return <TeamModelSettingsPage team={team} search={search} />;
}
