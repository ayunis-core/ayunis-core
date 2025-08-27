import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { AgentDetailPage } from "@/pages/agents";
import {
  agentsControllerFindOne,
  getAgentsControllerFindOneQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";

const agentDetailQueryOptions = (agentId: string) =>
  queryOptions({
    queryKey: getAgentsControllerFindOneQueryKey(agentId),
    queryFn: () => agentsControllerFindOne(agentId),
  });

export const Route = createFileRoute("/_authenticated/agents/$agentId")({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { agentId } }) => {
    const agent = await queryClient.fetchQuery(agentDetailQueryOptions(agentId));
    return agent;
  },
});

function RouteComponent() {
  const { agentId } = Route.useParams();
  const { data: agent } = useQuery(agentDetailQueryOptions(agentId));
  
  if (!agent) {
    return <div>Agent not found</div>;
  }

  return <AgentDetailPage agent={agent} />;
}