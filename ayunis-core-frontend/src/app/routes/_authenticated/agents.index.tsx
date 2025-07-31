import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { AgentsPage } from "@/pages/agents";
import {
  agentsControllerFindAll,
  getAgentsControllerFindAllQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";

const agentQueryOptions = () =>
  queryOptions({
    queryKey: getAgentsControllerFindAllQueryKey(),
    queryFn: () => agentsControllerFindAll(),
  });

export const Route = createFileRoute("/_authenticated/agents/")({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const agents = await queryClient.fetchQuery(agentQueryOptions());
    return agents;
  },
});

function RouteComponent() {
  const { data: agents } = useQuery(agentQueryOptions());
  return <AgentsPage agents={agents || []} />;
}
