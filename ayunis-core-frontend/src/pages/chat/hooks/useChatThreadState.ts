import { useCallback, useState } from 'react';
import type {
  PiiMaskResponseDto,
  RunMasksResponseDto,
  RunMessageResponseDtoMessage,
} from '@/shared/api';
import type { Message, Thread } from '@/pages/chat/model/openapi';
import { mergePiiMasks } from '@/pages/chat/lib/merge-pii-masks';
import { reconcileMessages } from '@/pages/chat/lib/reconcile-thread-messages';

export function useChatThreadState(thread: Thread, isStreaming: boolean) {
  const [threadTitle, setThreadTitle] = useState<string | undefined>(
    thread.title,
  );
  const [messages, setMessages] = useState<Message[]>(thread.messages);
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

  const handleMessage = useCallback((message: RunMessageResponseDtoMessage) => {
    setMessages((prev) => {
      const exists = prev.some((item) => item.id === message.id);
      if (exists) {
        return prev.map((item) => (item.id === message.id ? message : item));
      }
      return [...prev, message];
    });
  }, []);

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
