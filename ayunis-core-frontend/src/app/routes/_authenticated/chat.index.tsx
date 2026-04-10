import { createFileRoute } from '@tanstack/react-router';
import { NewChatPage, NewChatPageNoModelError } from '@/pages/new-chat';
import {
  modelsDefaultsControllerGetEffectiveDefaultModel,
  promptsControllerFindOne,
  getSubscriptionsControllerHasActiveSubscriptionQueryKey,
  subscriptionsControllerHasActiveSubscription,
  getPromptsControllerFindOneQueryKey,
  getModelsDefaultsControllerGetEffectiveDefaultModelQueryKey,
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
  queryKey: getModelsDefaultsControllerGetEffectiveDefaultModelQueryKey(),
  queryFn: () => modelsDefaultsControllerGetEffectiveDefaultModel(),
});

const queryPromptOptions = (prompt: string) => ({
  queryKey: getPromptsControllerFindOneQueryKey(prompt),
  queryFn: () => promptsControllerFindOne(prompt),
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
  prompt: z.string().optional(),
  modelId: z.string().optional(),
  agentId: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/chat/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({
    deps: { prompt: promptId, modelId, agentId },
    context: { queryClient },
  }) => {
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
    const prompt =
      promptId && featureToggles.promptsEnabled
        ? await queryClient.fetchQuery(queryPromptOptions(promptId))
        : undefined;
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
      prefilledPrompt: prompt?.content,
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
  const {
    selectedModelId,
    selectedAgentId,
    prefilledPrompt,
    isEmbeddingModelEnabled,
    agents,
  } = Route.useLoaderData();
  return (
    <NewChatPage
      selectedModelId={selectedModelId}
      selectedAgentId={selectedAgentId}
      prefilledPrompt={prefilledPrompt}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled}
      agents={agents}
    />
  );
}
