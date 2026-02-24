import { createFileRoute, redirect } from '@tanstack/react-router';
import { AgentsPage } from '@/pages/agents';
import {
  agentsControllerFindAll,
  getAgentsControllerFindAllQueryKey,
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/_authenticated/agents/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const featureToggles = await queryClient.fetchQuery({
      queryKey: getAppControllerFeatureTogglesQueryKey(),
      queryFn: () => appControllerFeatureToggles(),
    });
    if (!featureToggles.agentsEnabled) {
      throw redirect({ to: '/chat' });
    }
    const agents = await queryClient.fetchQuery({
      queryKey: getAgentsControllerFindAllQueryKey(),
      queryFn: () => agentsControllerFindAll(),
    });
    return { agents };
  },
});

function RouteComponent() {
  const { agents } = Route.useLoaderData();
  return <AgentsPage agents={agents} />;
}
