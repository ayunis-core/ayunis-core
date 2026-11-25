import { useCallback } from 'react';
import type {
  ChatRunParams,
  RunEndpoints,
  SendMessageInput,
} from '@ayunis/chat/runs';
import { useMessageSend } from '@/pages/chat/api/useMessageSend';
import { useOutlookToolBridge } from '@/pages/chat/hooks/useOutlookToolBridge';
import type { Message } from '@/pages/chat/model/openapi';
import { useThreadRunReattach } from './useThreadRunReattach';

interface UseMessageSendWithOutlookToolsParams extends ChatRunParams {
  messages: readonly Message[];
  isStreaming: boolean;
  piiMasks: readonly { token: string; value: string }[];
  transport?: RunEndpoints;
}

/**
 * `useMessageSend`, plus the Outlook pane's tools for the runs it sends. On
 * the web the bridge is inert.
 */
export function useMessageSendWithOutlookTools({
  messages,
  isStreaming,
  piiMasks,
  transport,
  ...params
}: UseMessageSendWithOutlookToolsParams) {
  const messageSend = useMessageSend(
    {
      ...params,
      onComplete: (failed, reason) => {
        params.onComplete?.(failed, reason);
        outlookTools.runEnded(failed, reason);
      },
    },
    transport,
  );
  // Let reattach register its stream before the bridge considers a reopened read.
  const { isRunCancellable, isCheckingForRun } = useThreadRunReattach({
    threadId: params.threadId,
    isStreaming,
    attach: messageSend.attach,
  });
  const outlookTools = useOutlookToolBridge({
    threadId: params.threadId,
    messages,
    isStreaming,
    isCheckingForRun,
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
    isRunCancellable,
    sendTextMessage: sendTextMessageWithOutlookTools,
    outlookToolBridge: outlookTools.bridge,
  };
}
