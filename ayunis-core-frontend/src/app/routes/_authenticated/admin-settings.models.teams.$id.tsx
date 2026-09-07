import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { TeamModelSettingsPage } from '@/pages/admin-settings/team-model-settings';
import { getTeamsControllerGetTeamQueryOptions } from '@/shared/api';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/models/teams/$id',
)({
  component: RouteComponent,
  validateSearch: z.object({
    tab: z.literal('teams').catch('teams'),
    search: z.string().catch(''),
  }),
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const team = await queryClient.fetchQuery(
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
