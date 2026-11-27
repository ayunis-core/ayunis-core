import { anonymousModeDefaultQueryOptions } from '@/features/anonymous-mode-default';
import { createFileRoute } from '@tanstack/react-router';
import {
  NewChatPage,
  NewChatPageNoModelError,
  onboardingStageQueryOptions,
} from '@/pages/new-chat';
import {
  getSubscriptionsControllerHasActiveSubscriptionQueryKey,
  subscriptionsControllerHasActiveSubscription,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
} from '@ayunis/api-client';
import extractErrorData from '@/shared/api/extract-error-data';
import { z } from 'zod';
import { defaultModelSelectionQueryOptions } from '@/widgets/model-select-options';
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
  loader: async ({ deps: { modelId }, context: { queryClient } }) => {
    // The composer reads these from the cache; loading them here keeps it
    // from rendering before its defaults are known.
    await queryClient.query(anonymousModeDefaultQueryOptions());
    if (!modelId) {
      await queryClient
        .query(defaultModelSelectionQueryOptions())
        .catch(handleDefaultModelLoadError);
    }
    await queryClient.query(queryIsEmbeddingModelEnabledOptions());
    const { hasActiveSubscription } = await queryClient.query(
      queryHasActiveSubscriptionOptions(),
    );
    // A stage the user completed since the last visit must not show again,
    // and a failed request only costs the hint.
    await queryClient
      .query({ ...onboardingStageQueryOptions(), staleTime: 0 })
      .catch(() => undefined);
    return { hasActiveSubscription };
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
  const { modelId, prompt, attachmentUrl, workspaceId } = Route.useSearch();
  const { user } = Route.useRouteContext();
  return (
    <NewChatPage
      key={workspaceId ?? 'no-workspace'}
      sessionKey={JSON.stringify([user.id, user.orgId])}
      initialModel={modelId}
      initialPrompt={prompt}
      initialAttachmentUrl={attachmentUrl}
      initialWorkspaceId={workspaceId}
    />
  );
}
