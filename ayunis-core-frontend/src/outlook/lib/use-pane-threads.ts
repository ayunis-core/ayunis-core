import { useCallback, useEffect, useState } from 'react';
import type { GetThreadsResponseDtoItem } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { PaneChatApi } from '@/outlook/api/pane-chat-api';

export type PaneThreadsState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'loaded'; threads: GetThreadsResponseDtoItem[] };

/**
 * The recent chats and the two changes the pane can make to them. A change
 * reaches the list only once the backend confirmed it, so a delete that
 * failed does not leave the chat looking gone.
 */
export function usePaneThreads(
  api: PaneChatApi,
  onFailure: (cause: unknown) => void,
) {
  const [state, setState] = useState<PaneThreadsState>({ status: 'loading' });
  const [actionFailed, setActionFailed] = useState(false);

  useEffect(() => {
    let current = true;
    api.listThreads().then(
      (threads) => current && setState({ status: 'loaded', threads }),
      (cause: unknown) => {
        if (!current) return;
        setState({ status: 'failed' });
        onFailure(cause);
      },
    );
    return () => {
      current = false;
    };
  }, [api, onFailure]);

  const apply = useCallback(
    (
      request: Promise<void>,
      change: (
        threads: GetThreadsResponseDtoItem[],
      ) => GetThreadsResponseDtoItem[],
    ) =>
      request.then(
        () =>
          setState((current) =>
            current.status === 'loaded'
              ? { ...current, threads: change(current.threads) }
              : current,
          ),
        (cause: unknown) => {
          setActionFailed(true);
          onFailure(cause);
        },
      ),
    [onFailure],
  );

  const rename = useCallback(
    (threadId: string, title: string) =>
      apply(api.renameThread(threadId, title), (threads) =>
        threads.map((entry) =>
          entry.id === threadId ? { ...entry, title } : entry,
        ),
      ),
    [api, apply],
  );

  const remove = useCallback(
    (threadId: string) =>
      apply(api.deleteThread(threadId), (threads) =>
        threads.filter((entry) => entry.id !== threadId),
      ),
    [api, apply],
  );

  return { state, actionFailed, rename, remove };
}
