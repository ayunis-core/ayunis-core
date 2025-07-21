import { createFileRoute } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import {
  threadsControllerFindOne,
  getThreadsControllerFindOneQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";
import ChatPage from "@/pages/chat/";

const threadQueryOptions = (threadId: string) =>
  queryOptions({
    queryKey: getThreadsControllerFindOneQueryKey(threadId),
    queryFn: () => threadsControllerFindOne(threadId),
  });

export const Route = createFileRoute("/_authenticated/chats/$threadId")({
  component: RouteComponent,
  loader: async ({ params: { threadId }, context: { queryClient } }) => {
    const thread = await queryClient.fetchQuery(threadQueryOptions(threadId));
    return thread;
  },
});

function RouteComponent() {
  const thread = Route.useLoaderData();
  return <ChatPage thread={thread} />;
}
