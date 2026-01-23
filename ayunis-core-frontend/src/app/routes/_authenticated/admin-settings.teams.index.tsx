import { createFileRoute } from '@tanstack/react-router';
import { TeamsSettingsPage } from '@/pages/admin-settings/teams-settings';
import {
  teamsControllerListTeams,
  getTeamsControllerListTeamsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/_authenticated/admin-settings/teams/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const teams = await queryClient.fetchQuery({
      queryKey: getTeamsControllerListTeamsQueryKey(),
      queryFn: () => teamsControllerListTeams(),
    });
    return { teams };
  },
});

function RouteComponent() {
  const { teams } = Route.useLoaderData();
  return <TeamsSettingsPage teams={teams} />;
}
