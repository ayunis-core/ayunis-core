import { createContext, useContext } from 'react';
import type {
  OutlookToolCall,
  OutlookToolOutcome,
} from '@/features/outlook-tools';

export type OutlookToolState = { status: 'running' } | OutlookToolOutcome;

export interface OutlookToolBridge {
  stateFor: (toolCallId: string) => OutlookToolState | undefined;
  /**
   * In the read view a draft opens Outlook's reply only when the user asks.
   * A reply being written already got the draft, and inserting it again
   * would discard the user's edits to it.
   */
  canOpenReply: (call: Pick<OutlookToolCall, 'id' | 'name'>) => boolean;
  openReply: (call: OutlookToolCall) => void;
}

/** Null outside the Outlook pane, where nothing runs Outlook tools. */
export const OutlookToolBridgeContext = createContext<OutlookToolBridge | null>(
  null,
);

export function useOutlookToolBridgeContext(): OutlookToolBridge | null {
  return useContext(OutlookToolBridgeContext);
}
