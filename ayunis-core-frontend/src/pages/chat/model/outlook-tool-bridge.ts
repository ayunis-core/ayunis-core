import { createContext, useContext } from 'react';
import type {
  OutlookReplyRecipients,
  OutlookToolCall,
  OutlookToolOutcome,
} from '@/features/outlook-tools';

export type OutlookToolState = { status: 'running' } | OutlookToolOutcome;

export interface OutlookToolBridge {
  stateFor: (toolCallId: string) => OutlookToolState | undefined;
  draftAction: (
    call: Pick<OutlookToolCall, 'id' | 'name'>,
  ) => 'reply' | 'insert' | null;
  insertDraft: (call: OutlookToolCall) => void;
  openReply: (
    call: OutlookToolCall,
    recipients: OutlookReplyRecipients,
  ) => void;
}

/** Null outside the Outlook pane, where nothing runs Outlook tools. */
export const OutlookToolBridgeContext = createContext<OutlookToolBridge | null>(
  null,
);

export function useOutlookToolBridgeContext(): OutlookToolBridge | null {
  return useContext(OutlookToolBridgeContext);
}
