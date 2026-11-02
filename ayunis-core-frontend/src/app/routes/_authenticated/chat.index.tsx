import { anonymousModeDefaultQueryOptions } from '@/features/anonymous-mode-default';
import { createFileRoute } from '@tanstack/react-router';
import { NewChatPage, NewChatPageNoModelError } from '@/pages/new-chat';
import {
  getSubscriptionsControllerHasActiveSubscriptionQueryKey,
  subscriptionsControllerHasActiveSubscription,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
  chatSettingsControllerGetSystemPrompt,
  getChatSettingsControllerGetSystemPromptQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { z } from 'zod';
import {
  defaultModelSelectionQueryOptions,
  toComposerValue,
} from './-default-model-selection-query';

function handleDefaultModelLoadError(error: unknown): null {
  let code: string | undefined;
  try {
    code = extractErrorData(error).code;
  } catch {
    return null;
  }
  if (code === 'NO_DEFAULT_MODEL_FOUND') {
    throw error;
  }
  return null;
}

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
  prompt: z.string().optional(),
  attachmentUrl: z.string().optional(),
  workspaceId: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/chat/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { modelId }, context: { queryClient } }) => {
    await queryClient.query(anonymousModeDefaultQueryOptions());
    let selectedModelId: string | undefined;
    if (modelId) {
      selectedModelId = modelId;
    } else {
      const defaultSelection = await queryClient
        .query(defaultModelSelectionQueryOptions())
        .catch(handleDefaultModelLoadError);
      selectedModelId = toComposerValue(defaultSelection);
    }
    const { isEmbeddingModelEnabled } = await queryClient.query(
      queryIsEmbeddingModelEnabledOptions(),
    );
    const { hasActiveSubscription } = await queryClient.query(
      queryHasActiveSubscriptionOptions(),
    );
    // Await system prompt status so PersonalizationCard doesn't flash
    await queryClient
      .query({
        queryKey: getChatSettingsControllerGetSystemPromptQueryKey(),
        queryFn: () => chatSettingsControllerGetSystemPrompt(),
      })
      .catch(() => undefined);
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
  const { prompt, attachmentUrl, workspaceId } = Route.useSearch();
  return (
    <NewChatPage
      key={workspaceId ?? 'no-workspace'}
      selectedModelId={selectedModelId}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled}
      initialPrompt={prompt}
      initialAttachmentUrl={attachmentUrl}
      initialWorkspaceId={workspaceId}
    />
  );
}
