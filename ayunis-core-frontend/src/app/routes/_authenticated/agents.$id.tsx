import { queryOptions } from '@tanstack/react-query';
import {
  agentsControllerFindOne,
  getAgentsControllerFindOneQueryKey,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
  sharesControllerGetShares,
  getSharesControllerGetSharesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { CreateAgentShareDtoEntityType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { createFileRoute } from '@tanstack/react-router';
import { AgentPage } from '@/pages/agent';
import { z } from 'zod';

const searchSchema = z.object({
  tab: z.enum(['config', 'share']).optional(),
});

const agentQueryOptions = (id: string) =>
  queryOptions({
    queryKey: getAgentsControllerFindOneQueryKey(id),
    queryFn: () => agentsControllerFindOne(id),
  });

const queryIsEmbeddingModelEnabledOptions = () => ({
  queryKey: getModelsControllerIsEmbeddingModelEnabledQueryKey(),
  queryFn: () => modelsControllerIsEmbeddingModelEnabled(),
});

const sharesQueryOptions = (agentId: string) =>
  queryOptions({
    queryKey: getSharesControllerGetSharesQueryKey({
      entityId: agentId,
      entityType: CreateAgentShareDtoEntityType.agent,
    }),
    queryFn: () =>
      sharesControllerGetShares({
        entityId: agentId,
        entityType: CreateAgentShareDtoEntityType.agent,
      }),
  });

export const Route = createFileRoute('/_authenticated/agents/$id')({
  component: RouteComponent,
  validateSearch: searchSchema,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const agent = await queryClient.fetchQuery(agentQueryOptions(id));
    const isEmbeddingModelEnabled = await queryClient.fetchQuery(
      queryIsEmbeddingModelEnabledOptions(),
    );
    const shares = await queryClient.fetchQuery(sharesQueryOptions(id));
    return { agent, isEmbeddingModelEnabled, shares };
  },
});

function RouteComponent() {
  const { agent, isEmbeddingModelEnabled, shares } = Route.useLoaderData();
  const { tab } = Route.useSearch();
  return (
    <AgentPage
      agent={agent}
      shares={shares}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled.isEmbeddingModelEnabled}
      initialTab={tab}
    />
  );
}
