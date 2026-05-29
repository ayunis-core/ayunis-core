import { createFileRoute } from '@tanstack/react-router';
import { NewChatPage, NewChatPageNoModelError } from '@/pages/new-chat';
import {
  modelsDefaultsControllerGetEffectiveDefaultModel,
  getSubscriptionsControllerHasActiveSubscriptionQueryKey,
  subscriptionsControllerHasActiveSubscription,
  getModelsDefaultsControllerGetEffectiveDefaultModelQueryKey,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
  chatSettingsControllerGetSystemPrompt,
  getChatSettingsControllerGetSystemPromptQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { z } from 'zod';

const queryDefaultModelOptions = () => ({
  queryKey: getModelsDefaultsControllerGetEffectiveDefaultModelQueryKey(),
  queryFn: () => modelsDefaultsControllerGetEffectiveDefaultModel(),
});

const queryHasActiveSubscriptionOptions = () => ({
  queryKey: getSubscriptionsControllerHasActiveSubscriptionQueryKey(),
  queryFn: () => subscriptionsControllerHasActiveSubscription(),
});

const queryIsEmbeddingModelEnabledOptions = () => ({
  queryKey: getModelsControllerIsEmbeddingModelEnabledQueryKey(),
  queryFn: () => modelsControllerIsEmbeddingModelEnabled(),
});

const searchSchema = z.object({
  modelId: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/chat/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { modelId }, context: { queryClient } }) => {
    let selectedModelId: string | undefined;
    if (modelId) {
      selectedModelId = modelId;
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
    // Await system prompt status so PersonalizationCard doesn't flash
    await queryClient.prefetchQuery({
      queryKey: getChatSettingsControllerGetSystemPromptQueryKey(),
      queryFn: () => chatSettingsControllerGetSystemPrompt(),
    });
    return {
      selectedModelId,
      hasActiveSubscription,
      isEmbeddingModelEnabled,
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
      return <NewChatPageNoModelError />;
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { selectedModelId, isEmbeddingModelEnabled } = Route.useLoaderData();
  return (
    <NewChatPage
      selectedModelId={selectedModelId}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled}
    />
  );
}
