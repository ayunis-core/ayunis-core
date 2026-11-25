import { useCallback, useState } from 'react';
import type {
  PiiMaskResponseDto,
  RunMasksResponseDto,
  RunMessageResponseDto,
  GetThreadResponseDto,
} from '@ayunis/api-client/schemas';
import { mergePiiMasks } from './merge-pii-masks';
import { reconcileMessages } from './reconcile-thread-messages';

type ThreadSnapshot = Pick<
  GetThreadResponseDto,
  'id' | 'title' | 'messages' | 'piiMasks'
>;

export function useChatThreadState(
  thread: ThreadSnapshot,
  isStreaming: boolean,
) {
  const [threadTitle, setThreadTitle] = useState<string | undefined>(
    thread.title,
  );
  const [messages, setMessages] = useState(thread.messages);
  const [piiMasks, setPiiMasks] = useState<PiiMaskResponseDto[]>(
    thread.piiMasks,
  );
  const [reconciledThread, setReconciledThread] = useState(thread);

  if (thread !== reconciledThread) {
    const isSameThread = thread.id === reconciledThread.id;
    const messagesChanged = thread.messages !== reconciledThread.messages;
    setReconciledThread(thread);
    if (!isSameThread || (!isStreaming && messagesChanged)) {
      setMessages(reconcileMessages(messages, reconciledThread, thread));
    }
    if (!isSameThread || thread.title !== reconciledThread.title) {
      setThreadTitle(thread.title);
    }
    setPiiMasks(
      isSameThread ? mergePiiMasks(piiMasks, thread.piiMasks) : thread.piiMasks,
    );
  }

  const handleMessage = useCallback(
    (message: RunMessageResponseDto['message']) => {
      setMessages((prev) =>
        prev.some((item) => item.id === message.id)
          ? prev.map((item) => (item.id === message.id ? message : item))
          : [...prev, message],
      );
    },
    [],
  );

  const handleMasks = useCallback((data: RunMasksResponseDto) => {
    setPiiMasks((prev) => mergePiiMasks(prev, data.masks));
  }, []);

  return {
    messages,
    setMessages,
    piiMasks,
    setPiiMasks,
    threadTitle,
    setThreadTitle,
    handleMessage,
    handleMasks,
  };
}
