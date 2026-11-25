import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

export interface ChatDraftStorage {
  readonly read: (threadId: string) => string;
  readonly write: (threadId: string, message: string) => void;
  readonly subscribe?: (listener: () => void) => () => void;
}

export function createMemoryChatDraftStorage(): ChatDraftStorage {
  const messages = new Map<string, string>();
  const listeners = new Set<() => void>();
  return {
    read: (id) => messages.get(id) ?? '',
    write(id, message) {
      if ((messages.get(id) ?? '') === message) return;
      if (message) messages.set(id, message);
      else messages.delete(id);
      listeners.forEach((notify) => notify());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

interface ChatDraftState {
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
}

export function useChatDraft(
  chatId: string | undefined,
  storage: ChatDraftStorage,
  initialMessage?: string,
): ChatDraftState {
  const [message, setMessageState] = useState(
    () => initialMessage ?? (chatId ? storage.read(chatId) : ''),
  );
  const currentMessage = useRef(message);
  const activeChatId = useRef(chatId);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    const updateMessage = (nextMessage: string) => {
      currentMessage.current = nextMessage;
      setMessageState(nextMessage);
    };
    if (activeChatId.current !== chatId) {
      activeChatId.current = chatId;
      updateMessage(initialMessage ?? (chatId ? storage.read(chatId) : ''));
    }
    mounted.current = true;
    const unsubscribe = subscribeToDraft(storage, chatId, updateMessage);
    if (unsubscribe && initialMessage === undefined && chatId) {
      updateMessage(storage.read(chatId));
    }
    return () => {
      mounted.current = false;
      if (unsubscribe) unsubscribe();
    };
  }, [chatId, initialMessage, storage]);

  const setMessage = useCallback<Dispatch<SetStateAction<string>>>(
    (nextMessage) => {
      const isActive = mounted.current && chatId === activeChatId.current;
      let previous = currentMessage.current;
      if (!isActive) previous = chatId ? storage.read(chatId) : '';
      const resolvedMessage =
        typeof nextMessage === 'function' ? nextMessage(previous) : nextMessage;
      if (chatId) storage.write(chatId, resolvedMessage);
      if (isActive) {
        currentMessage.current = resolvedMessage;
        setMessageState(resolvedMessage);
      }
    },
    [chatId, storage],
  );

  return { message, setMessage };
}

function subscribeToDraft(
  storage: ChatDraftStorage,
  chatId: string | undefined,
  update: (message: string) => void,
) {
  if (!chatId) return;
  return storage.subscribe?.(() => update(storage.read(chatId)));
}
