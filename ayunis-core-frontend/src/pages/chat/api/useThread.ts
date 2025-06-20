import { useThreadsControllerFindOne } from "@/shared/api";
import type { Thread } from "../model/openapi";

export function useThread(threadId: string, initialData?: Thread) {
  const { data: thread } = useThreadsControllerFindOne(threadId, {
    query: {
      initialData,
      queryKey: ["threads", threadId],
    },
  });

  return thread;
}
