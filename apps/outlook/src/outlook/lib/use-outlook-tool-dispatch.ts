import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  chatItemKey,
  currentOutlookItemKey,
  currentOutlookReplySourceKey,
  isAwaitingResultTool,
  isOutlookDraftTool,
  isOutlookTool,
  rememberChatItem,
  rememberOutlookDraftSource,
  waitsForUser,
  type OutlookToolDependencies,
  type OutlookToolOutcome,
} from '@/features/outlook-tools';
import type { ClientToolDispatch } from '@ayunis/chat/runs';
import type { ClientToolCall, ClientToolExecutor } from '@ayunis/chat/surface';
import { outlookClientTools } from '@/outlook/model/outlook-client-tools';

export type CallItemKeys = Record<string, string | null>;

type ExecuteRegistered = (
  executeTool: ClientToolExecutor<OutlookToolDependencies, OutlookToolOutcome>,
  call: ClientToolCall,
  options: { signal: AbortSignal; expectedItemKey: string | null },
) => Promise<OutlookToolOutcome>;

interface RunOrigin {
  itemKey: string | null;
  observingFromReply: boolean;
}

/**
 * The mail a run is about. A new chat's first run belongs to the mail the
 * chat was created next to, even if the user moved on before it opened;
 * every later message the user sends is about the mail open now.
 */
function itemKeyForRun(threadId: string, takesOverStartedRun: boolean) {
  const created = chatItemKey(threadId);
  // A chat created with no mail open is about none: null is kept, so the
  // run refuses to act on a mail opened since.
  if (takesOverStartedRun && created !== undefined) return created;
  const itemKey = currentOutlookItemKey();
  rememberChatItem(threadId, itemKey);
  return itemKey;
}

function runOriginOnOpen(threadId: string): {
  origin: RunOrigin;
  resume: boolean;
} {
  const chatItem = chatItemKey(threadId);
  const itemKey = chatItem === undefined ? currentOutlookItemKey() : chatItem;
  return {
    origin: {
      itemKey,
      observingFromReply:
        itemKey !== null && itemKey === currentOutlookReplySourceKey(),
    },
    // Reopening can continue a read on the same mail. Earlier writes stay handled.
    resume: Boolean(chatItem) && chatItem === currentOutlookItemKey(),
  };
}

function noteCallItems(
  threadId: string,
  itemKey: string | null,
  calls: readonly ClientToolCall[],
  setCallItemKeys: Dispatch<SetStateAction<CallItemKeys>>,
): void {
  const latestDraft = calls
    .filter(({ name }) => isOutlookTool(name) && isOutlookDraftTool(name))
    .at(-1);
  if (latestDraft) {
    rememberOutlookDraftSource(threadId, latestDraft.id, itemKey);
  }
  setCallItemKeys((current) => ({
    ...current,
    ...Object.fromEntries(calls.map(({ id }) => [id, itemKey])),
  }));
}

// A separate reply pane can observe the original run without executing it.
function canDispatchFrom({ itemKey, observingFromReply }: RunOrigin): boolean {
  return !observingFromReply || itemKey !== currentOutlookReplySourceKey();
}

export function useOutlookToolDispatch(
  threadId: string,
  executeRegistered: ExecuteRegistered,
) {
  // The mail the run started on; the tools refuse to act on another. A run
  // the chat did not start, such as one reattached after a reload, belongs
  // to the mail the chat was opened next to.
  const runOrigin = useRef<RunOrigin>({
    itemKey: null,
    observingFromReply: false,
  });
  // The mail each call was made for. A draft from read mode can only be
  // inserted into a reply to that mail.
  const [callItemKeys, setCallItemKeys] = useState<CallItemKeys>({});
  const dispatch: ClientToolDispatch<
    OutlookToolDependencies,
    OutlookToolOutcome
  > = {
    registry: outlookClientTools,
    expectsResult: ({ name }) => isAwaitingResultTool(name),
    resumeOnOpen() {
      const { origin, resume } = runOriginOnOpen(threadId);
      runOrigin.current = origin;
      return resume;
    },
    onBeginRun(takesOverStartedRun) {
      runOrigin.current = {
        itemKey: itemKeyForRun(threadId, takesOverStartedRun),
        observingFromReply: false,
      };
    },
    canDispatch: () => canDispatchFrom(runOrigin.current),
    shouldExecute: ({ name }) =>
      isOutlookTool(name) && !waitsForUser(name, runOrigin.current.itemKey),
    onCalls(calls) {
      noteCallItems(
        threadId,
        runOrigin.current.itemKey,
        calls,
        setCallItemKeys,
      );
    },
    async invoke(executor, call, signal) {
      const outcome = await executeRegistered(executor, call, {
        signal,
        expectedItemKey: runOrigin.current.itemKey,
      });
      return outcome.status === 'result' ? outcome.result : undefined;
    },
  };
  return { dispatch, callItemKeys };
}
