import { anonymousModeDefaultQueryOptions } from '@/features/anonymous-mode-default';
import { createFileRoute, useRouterState } from '@tanstack/react-router';
import {
  NewChatPage,
  NewChatPageNoModelError,
  onboardingStageQueryOptions,
} from '@/pages/new-chat';
import { useEmbedded } from '@/shared/contexts/embedded/embeddedContext';
import {
  getSubscriptionsControllerHasActiveSubscriptionQueryKey,
  subscriptionsControllerHasActiveSubscription,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { z } from 'zod';
import {
  defaultModelSelectionQueryOptions,
  toComposerValue,
} from './-default-model-selection-query';
import { searchParamString } from '@/shared/lib/search-params';

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
  modelId: searchParamString.optional(),
  prompt: searchParamString.optional(),
  attachmentUrl: searchParamString.optional(),
  workspaceId: searchParamString.optional(),
});

export const Route = createFileRoute('/_authenticated/chat/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { modelId }, context: { queryClient, embedded } }) => {
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
    // The pane has no onboarding hint, and its token may not read billing or
    // the onboarding stage.
    if (embedded) {
      return {
        selectedModelId,
        hasActiveSubscription: false,
        isEmbeddingModelEnabled,
      };
    }
    const { hasActiveSubscription } = await queryClient.query(
      queryHasActiveSubscriptionOptions(),
    );
    // A stage the user completed since the last visit must not show again,
    // and a failed request only costs the hint.
    await queryClient
      .query({ ...onboardingStageQueryOptions(), staleTime: 0 })
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
  // In the Outlook pane every navigation to a new chat (another email, "Neuer
  // Chat") starts a fresh composer; text typed for one email stays with it.
  const isEmbedded = useEmbedded();
  const navigationKey = useRouterState({
    select: (state) => state.location.state.__TSR_key,
  });
  return (
    <NewChatPage
      key={
        isEmbedded ? (navigationKey ?? 'pane') : (workspaceId ?? 'no-workspace')
      }
      selectedModelId={selectedModelId}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled}
      initialPrompt={prompt}
      initialAttachmentUrl={attachmentUrl}
      initialWorkspaceId={workspaceId}
    />
  );
}
