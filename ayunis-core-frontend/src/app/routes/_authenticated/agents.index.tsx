import { createFileRoute } from '@tanstack/react-router';
import { AgentsPage } from '@/pages/agents';
import {
  agentsControllerFindAll,
  getAgentsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/_authenticated/agents/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
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
