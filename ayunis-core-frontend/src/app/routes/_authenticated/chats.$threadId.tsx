import { createFileRoute } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import {
  threadsControllerFindOne,
  getThreadsControllerFindOneQueryKey,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
} from "@/shared/api/generated/ayunisCoreAPI";
import ChatPage from "@/pages/chat/";

const threadQueryOptions = (threadId: string) =>
  queryOptions({
    queryKey: getThreadsControllerFindOneQueryKey(threadId),
    queryFn: () => threadsControllerFindOne(threadId),
  });

const queryIsEmbeddingModelEnabledOptions = () => ({
  queryKey: getModelsControllerIsEmbeddingModelEnabledQueryKey(),
  queryFn: () => modelsControllerIsEmbeddingModelEnabled(),
});

export const Route = createFileRoute("/_authenticated/chats/$threadId")({
  component: RouteComponent,
  loader: async ({ params: { threadId }, context: { queryClient } }) => {
    const thread = await queryClient.fetchQuery(threadQueryOptions(threadId));
    const { isEmbeddingModelEnabled } = await queryClient.fetchQuery(
      queryIsEmbeddingModelEnabledOptions(),
    );
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
