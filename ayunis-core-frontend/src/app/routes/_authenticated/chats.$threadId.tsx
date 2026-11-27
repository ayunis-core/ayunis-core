import { createFileRoute } from '@tanstack/react-router';
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import {
  threadsControllerFindOne,
  getThreadsControllerFindOneQueryKey,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
  getModelsControllerGetPermittedLanguageModelsQueryOptions,
} from '@ayunis/api-client/endpoints';
import ChatPage from '@/pages/chat/';
import { searchParamString } from '@/shared/lib/search-params';

const threadQueryOptions = (threadId: string) =>
  queryOptions({
    queryKey: getThreadsControllerFindOneQueryKey(threadId),
    queryFn: () => threadsControllerFindOne(threadId),
  });

const queryIsEmbeddingModelEnabledOptions = () => ({
  queryKey: getModelsControllerIsEmbeddingModelEnabledQueryKey(),
  queryFn: () => modelsControllerIsEmbeddingModelEnabled(),
});

export const Route = createFileRoute('/_authenticated/chats/$threadId')({
  component: RouteComponent,
  validateSearch: z.object({
    artifactId: searchParamString.optional(),
  }),
  loader: async ({ params: { threadId }, context: { queryClient, user } }) => {
    // Prefetch the permitted models and the embedding status so the composer
    // can decide synchronously whether the thread's model is still available
    // and documents can be attached, instead of rendering the input and
    // hiding it once the client-side fetch settles (AYC-666). The models
    // error is swallowed so a failing request never blocks navigation.
    const [thread] = await Promise.all([
      queryClient.query(threadQueryOptions(threadId)),
      queryClient.query(queryIsEmbeddingModelEnabledOptions()),
      queryClient
        .query(getModelsControllerGetPermittedLanguageModelsQueryOptions())
        .catch(() => undefined),
    ]);
    return {
      thread,
      sessionKey: JSON.stringify([user.id, user.orgId]),
    };
  },
});

function RouteComponent() {
  const { thread, sessionKey } = Route.useLoaderData();
  const { artifactId } = Route.useSearch();
  return (
    <ChatPage
      thread={thread}
      sessionKey={sessionKey}
      initialArtifactId={artifactId}
    />
  );
}
