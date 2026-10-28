import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { readChatDraft, writeChatDraft } from '@/shared/lib/chat-draft-storage';

interface ChatDraftState {
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
}

export function useChatDraft(
  chatId: string | undefined,
  initialMessage?: string,
): ChatDraftState {
  const [message, setMessageState] = useState(
    () => initialMessage ?? (chatId ? readChatDraft(chatId) : ''),
  );
  const currentMessage = useRef(message);
  const activeChatId = useRef(chatId);

  useLayoutEffect(() => {
    if (activeChatId.current === chatId) return;

    const nextMessage = initialMessage ?? (chatId ? readChatDraft(chatId) : '');
    activeChatId.current = chatId;
    currentMessage.current = nextMessage;
    setMessageState(nextMessage);
  }, [chatId, initialMessage]);

  const setMessage = useCallback<Dispatch<SetStateAction<string>>>(
    (nextMessage) => {
      const resolvedMessage =
        typeof nextMessage === 'function'
          ? nextMessage(currentMessage.current)
          : nextMessage;
      currentMessage.current = resolvedMessage;
      if (chatId) writeChatDraft(chatId, resolvedMessage);
      setMessageState(resolvedMessage);
    },
    [chatId],
  );

  return { message, setMessage };
}
