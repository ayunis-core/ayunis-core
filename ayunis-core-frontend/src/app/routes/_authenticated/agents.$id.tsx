import { queryOptions } from '@tanstack/react-query';
import {
  agentsControllerFindOne,
  getAgentsControllerFindOneQueryKey,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
} from '@/shared/api/generated/ayunisCoreAPI';
import { createFileRoute } from '@tanstack/react-router';
import { AgentPage } from '@/pages/agent';

const agentQueryOptions = (id: string) =>
  queryOptions({
    queryKey: getAgentsControllerFindOneQueryKey(id),
    queryFn: () => agentsControllerFindOne(id),
  });

const queryIsEmbeddingModelEnabledOptions = () => ({
  queryKey: getModelsControllerIsEmbeddingModelEnabledQueryKey(),
  queryFn: () => modelsControllerIsEmbeddingModelEnabled(),
});

export const Route = createFileRoute('/_authenticated/agents/$id')({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const agent = await queryClient.fetchQuery(agentQueryOptions(id));
    const isEmbeddingModelEnabled = await queryClient.fetchQuery(
      queryIsEmbeddingModelEnabledOptions(),
    );
    return { agent, isEmbeddingModelEnabled };
  },
});

function RouteComponent() {
  const { agent, isEmbeddingModelEnabled } = Route.useLoaderData();
  return (
    <AgentPage
      agent={agent}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled.isEmbeddingModelEnabled}
    />
  );
}
