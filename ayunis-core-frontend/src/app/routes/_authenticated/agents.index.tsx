import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { AgentsPage } from "@/pages/agents";
import {
  agentsControllerFindAll,
  getAgentsControllerFindAllQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";

const agentsQueryOptions = () =>
  queryOptions({
    queryKey: getAgentsControllerFindAllQueryKey(),
    queryFn: () => agentsControllerFindAll(),
  });

export const Route = createFileRoute("/_authenticated/agents/")({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const agents = await queryClient.fetchQuery(agentsQueryOptions());
    return agents;
  },
});

function RouteComponent() {
  const { data: agents } = useQuery(agentsQueryOptions());
  return <AgentsPage agents={agents || []} />;
}
