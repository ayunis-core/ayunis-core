import { queryOptions } from "@tanstack/react-query";
import {
  agentsControllerFindOne,
  getAgentsControllerFindOneQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";
import { createFileRoute } from "@tanstack/react-router";
import { AgentPage } from "@/pages/agent";

const agentQueryOptions = (id: string) =>
  queryOptions({
    queryKey: getAgentsControllerFindOneQueryKey(id),
    queryFn: () => agentsControllerFindOne(id),
  });

export const Route = createFileRoute("/_authenticated/agents/$id")({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const agent = await queryClient.fetchQuery(agentQueryOptions(id));
    return { agent };
  },
});

function RouteComponent() {
  const { agent } = Route.useLoaderData();
  return <AgentPage agent={agent} />;
}
