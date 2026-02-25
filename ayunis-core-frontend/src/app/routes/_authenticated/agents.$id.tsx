import { queryOptions } from '@tanstack/react-query';
import {
  agentsControllerFindOne,
  getAgentsControllerFindOneQueryKey,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
  sharesControllerGetShares,
  getSharesControllerGetSharesQueryKey,
  teamsControllerListMyTeams,
  getTeamsControllerListMyTeamsQueryKey,
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { CreateAgentShareDtoEntityType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { createFileRoute, redirect } from '@tanstack/react-router';
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

const userTeamsQueryOptions = () =>
  queryOptions({
    queryKey: getTeamsControllerListMyTeamsQueryKey(),
    queryFn: () => teamsControllerListMyTeams(),
  });

export const Route = createFileRoute('/_authenticated/agents/$id')({
  component: RouteComponent,
  validateSearch: searchSchema,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const featureToggles = await queryClient.fetchQuery({
      queryKey: getAppControllerFeatureTogglesQueryKey(),
      queryFn: () => appControllerFeatureToggles(),
    });
    if (!featureToggles.agentsEnabled) {
      throw redirect({ to: '/chat' });
    }
    const agent = await queryClient.fetchQuery(agentQueryOptions(id));
    const isEmbeddingModelEnabled = await queryClient.fetchQuery(
      queryIsEmbeddingModelEnabledOptions(),
    );
    // Only query shares and user teams if the user owns the agent (not shared)
    const shares = agent.isShared
      ? []
      : await queryClient.fetchQuery(sharesQueryOptions(id));
    const userTeams = agent.isShared
      ? []
      : await queryClient.fetchQuery(userTeamsQueryOptions());
    return { agent, isEmbeddingModelEnabled, shares, userTeams };
  },
});

function RouteComponent() {
  const { agent, isEmbeddingModelEnabled, shares, userTeams } =
    Route.useLoaderData();
  const { tab } = Route.useSearch();
  return (
    <AgentPage
      agent={agent}
      shares={shares}
      userTeams={userTeams}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled.isEmbeddingModelEnabled}
      initialTab={tab}
    />
  );
}
