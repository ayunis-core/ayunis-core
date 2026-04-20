import { createFileRoute } from '@tanstack/react-router';
import { NewChatPage, NewChatPageNoModelError } from '@/pages/new-chat';
import {
  modelsControllerGetEffectiveDefaultModel,
  getSubscriptionsControllerHasActiveSubscriptionQueryKey,
  subscriptionsControllerHasActiveSubscription,
  getModelsControllerGetEffectiveDefaultModelQueryKey,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
  getAgentsControllerFindAllQueryKey,
  agentsControllerFindAll,
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
  chatSettingsControllerGetSystemPrompt,
  getChatSettingsControllerGetSystemPromptQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { z } from 'zod';

const queryDefaultModelOptions = () => ({
  queryKey: getModelsControllerGetEffectiveDefaultModelQueryKey(),
  queryFn: () => modelsControllerGetEffectiveDefaultModel(),
});

const queryHasActiveSubscriptionOptions = () => ({
  queryKey: getSubscriptionsControllerHasActiveSubscriptionQueryKey(),
  queryFn: () => subscriptionsControllerHasActiveSubscription(),
});

const queryIsEmbeddingModelEnabledOptions = () => ({
  queryKey: getModelsControllerIsEmbeddingModelEnabledQueryKey(),
  queryFn: () => modelsControllerIsEmbeddingModelEnabled(),
});

const queryAgentsOptions = () => ({
  queryKey: getAgentsControllerFindAllQueryKey(),
  queryFn: () => agentsControllerFindAll(),
});

const searchSchema = z.object({
  modelId: z.string().optional(),
  agentId: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/chat/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { modelId, agentId }, context: { queryClient } }) => {
    const featureToggles = await queryClient.fetchQuery({
      queryKey: getAppControllerFeatureTogglesQueryKey(),
      queryFn: () => appControllerFeatureToggles(),
    });
    let selectedModelId: string | undefined;
    let selectedAgentId: string | undefined;
    if (modelId) {
      selectedModelId = modelId;
    } else if (agentId) {
      selectedAgentId = agentId;
    } else {
      const defaultModelResponse = await queryClient.fetchQuery(
        queryDefaultModelOptions(),
      );
      const defaultModel = defaultModelResponse.permittedLanguageModel;
      selectedModelId = defaultModel?.id;
    }
    const { isEmbeddingModelEnabled } = await queryClient.fetchQuery(
      queryIsEmbeddingModelEnabledOptions(),
    );
    const { hasActiveSubscription } = await queryClient.fetchQuery(
      queryHasActiveSubscriptionOptions(),
    );
    const agents = featureToggles.agentsEnabled
      ? await queryClient.fetchQuery(queryAgentsOptions())
      : [];
    // Await system prompt status so PersonalizationCard doesn't flash
    await queryClient.prefetchQuery({
      queryKey: getChatSettingsControllerGetSystemPromptQueryKey(),
      queryFn: () => chatSettingsControllerGetSystemPrompt(),
    });
    return {
      selectedModelId,
      selectedAgentId,
      hasActiveSubscription,
      isEmbeddingModelEnabled,
      agents,
    };
  },
  errorComponent: ({ error }) => {
    try {
      const { code } = extractErrorData(error);
      if (code === 'MODEL_NOT_FOUND') {
        return <NewChatPageNoModelError />;
      }
      return <NewChatPageNoModelError />;
    } catch {
      // Non-AxiosError (network failure, request cancellation, etc.)
      return <NewChatPageNoModelError />;
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { selectedModelId, selectedAgentId, isEmbeddingModelEnabled, agents } =
    Route.useLoaderData();
  return (
    <NewChatPage
      selectedModelId={selectedModelId}
      selectedAgentId={selectedAgentId}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled}
      agents={agents}
    />
  );
}
