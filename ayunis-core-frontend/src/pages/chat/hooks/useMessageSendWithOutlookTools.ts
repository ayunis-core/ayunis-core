import { useCallback } from 'react';
import {
  useMessageSend,
  type SendMessageInput,
  type UseMessageSendParams,
} from '@/pages/chat/api/useMessageSend';
import { useOutlookToolBridge } from '@/pages/chat/hooks/useOutlookToolBridge';
import type { Message } from '@/pages/chat/model/openapi';

interface UseMessageSendWithOutlookToolsParams extends UseMessageSendParams {
  messages: readonly Message[];
  isStreaming: boolean;
  piiMasks: readonly { token: string; value: string }[];
}

/**
 * `useMessageSend`, plus the Outlook pane's tools for the runs it sends. On
 * the web the bridge is inert and this is `useMessageSend` unchanged.
 */
export function useMessageSendWithOutlookTools({
  messages,
  isStreaming,
  piiMasks,
  ...params
}: UseMessageSendWithOutlookToolsParams) {
  const messageSend = useMessageSend({
    ...params,
    onComplete: (failed) => {
      params.onComplete?.(failed);
      outlookTools.runEnded(failed);
    },
  });
  const outlookTools = useOutlookToolBridge({
    threadId: params.threadId,
    messages,
    isStreaming,
    piiMasks,
    sendToolResult: messageSend.sendToolResult,
  });
  const { beginRun } = outlookTools;
  const { sendTextMessage } = messageSend;
  const sendTextMessageWithOutlookTools = useCallback(
    (input: SendMessageInput) => {
      beginRun({ takesOverStartedRun: input.startedRequest !== undefined });
      return sendTextMessage(input);
    },
    [beginRun, sendTextMessage],
  );

  return {
    ...messageSend,
    sendTextMessage: sendTextMessageWithOutlookTools,
    outlookToolBridge: outlookTools.bridge,
  };
}
