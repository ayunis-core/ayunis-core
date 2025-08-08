import { createFileRoute } from "@tanstack/react-router";
import { NewChatPage, NewChatPageNoModelError } from "@/pages/new-chat";
import {
  modelsControllerGetEffectiveDefaultModel,
  promptsControllerFindOne,
  getSubscriptionsControllerHasActiveSubscriptionQueryKey,
  subscriptionsControllerHasActiveSubscription,
  getPromptsControllerFindOneQueryKey,
  getModelsControllerGetEffectiveDefaultModelQueryKey,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
} from "@/shared/api";
import extractErrorData from "@/shared/api/extract-error-data";
import { z } from "zod";

const queryDefaultModelOptions = () => ({
  queryKey: getModelsControllerGetEffectiveDefaultModelQueryKey(),
  queryFn: () => modelsControllerGetEffectiveDefaultModel(),
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

const searchSchema = z.object({
  prompt: z.string().optional(),
  modelId: z.string().optional(),
  agentId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/chat/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({
    deps: { prompt: promptId, modelId, agentId },
    context: { queryClient },
  }) => {
    let selectedModelId: string | undefined;
    let selectedAgentId: string | undefined;
    if (modelId) {
      selectedModelId = modelId;
    } else if (agentId) {
      selectedAgentId = agentId;
    } else {
      const defaultModel = await queryClient.fetchQuery(
        queryDefaultModelOptions(),
      );
      selectedModelId = defaultModel.id;
    }
    const { isEmbeddingModelEnabled } = await queryClient.fetchQuery(
      queryIsEmbeddingModelEnabledOptions(),
    );
    const { hasActiveSubscription } = await queryClient.fetchQuery(
      queryHasActiveSubscriptionOptions(),
    );
    const prompt = promptId
      ? await queryClient.fetchQuery(queryPromptOptions(promptId))
      : undefined;
    return {
      selectedModelId,
      selectedAgentId,
      prefilledPrompt: prompt?.content,
      hasActiveSubscription,
      isEmbeddingModelEnabled,
    };
  },
  errorComponent: ({ error }) => {
    const { code } = extractErrorData(error);
    if (code === "MODEL_NOT_FOUND") {
      return <NewChatPageNoModelError />;
    }
    return <NewChatPageNoModelError />;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const {
    selectedModelId,
    selectedAgentId,
    prefilledPrompt,
    isEmbeddingModelEnabled,
  } = Route.useLoaderData();
  return (
    <NewChatPage
      selectedModelId={selectedModelId}
      selectedAgentId={selectedAgentId}
      prefilledPrompt={prefilledPrompt}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled}
    />
  );
}
