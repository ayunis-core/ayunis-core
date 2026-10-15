import { createFileRoute } from '@tanstack/react-router';
import { TeamsSettingsPage } from '@/pages/admin-settings/teams-settings';
import {
  teamsControllerListTeams,
  getTeamsControllerListTeamsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { isForbiddenError } from '@/shared/api/is-forbidden-error';

export const Route = createFileRoute('/_authenticated/admin-settings/teams/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    try {
      const teams = await queryClient.query({
        queryKey: getTeamsControllerListTeamsQueryKey(),
        queryFn: () => teamsControllerListTeams(),
      });
      return { teams, forbidden: false };
    } catch (error) {
      if (!isForbiddenError(error)) throw error;
      return { teams: [], forbidden: true };
    }
  },
});

function RouteComponent() {
  const { teams, forbidden } = Route.useLoaderData();
  return <TeamsSettingsPage teams={teams} forbidden={forbidden} />;
}
