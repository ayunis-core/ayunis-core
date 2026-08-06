import { createFileRoute } from '@tanstack/react-router';
import { queryOptions } from '@tanstack/react-query';
import {
  threadsControllerFindOne,
  getThreadsControllerFindOneQueryKey,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
  getModelsControllerGetPermittedLanguageModelsQueryOptions,
} from '@/shared/api/generated/ayunisCoreAPI';
import ChatPage from '@/pages/chat/';

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
  loader: async ({ params: { threadId }, context: { queryClient } }) => {
    // Prefetch the permitted models so ChatPage can decide synchronously
    // whether the thread's model is still available, instead of rendering
    // the input and hiding it once the client-side fetch settles (AYC-666).
    // prefetchQuery swallows errors, so a failing models request never
    // blocks navigation.
    const [thread, { isEmbeddingModelEnabled }] = await Promise.all([
      queryClient.fetchQuery(threadQueryOptions(threadId)),
      queryClient.fetchQuery(queryIsEmbeddingModelEnabledOptions()),
      queryClient.prefetchQuery(
        getModelsControllerGetPermittedLanguageModelsQueryOptions(),
      ),
    ]);
    return { thread, isEmbeddingModelEnabled };
  },
});

function RouteComponent() {
  const { thread, isEmbeddingModelEnabled } = Route.useLoaderData();
  return (
    <ChatPage
      thread={thread}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled}
    />
  );
}
