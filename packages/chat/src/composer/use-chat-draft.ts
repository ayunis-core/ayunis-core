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

  useLayoutEffect(() => {
    if (activeChatId.current === chatId) return;

    const nextMessage = initialMessage ?? (chatId ? storage.read(chatId) : '');
    activeChatId.current = chatId;
    currentMessage.current = nextMessage;
    setMessageState(nextMessage);
  }, [chatId, initialMessage, storage]);

  const setMessage = useCallback<Dispatch<SetStateAction<string>>>(
    (nextMessage) => {
      const isActive = chatId === activeChatId.current;
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
