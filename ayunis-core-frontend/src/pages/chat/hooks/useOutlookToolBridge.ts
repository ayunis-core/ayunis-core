import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  addAttachmentAsSource,
  answeredToolCallIds,
  chatItemKey,
  currentOutlookItemKey,
  currentOutlookMailboxItem,
  currentOutlookReplySourceKey,
  executeOutlookTool,
  hasCallAwaitingConfirmation,
  isAwaitingResultTool,
  isOutlookDraftTool,
  outlookDraftSource,
  outlookToolCalls,
  OUTLOOK_TOOL,
  rememberChatItem,
  rememberOutlookDraftSource,
  waitsForUser,
  subscribeToOutlookItem,
  type OutlookToolCall,
  type OutlookToolOutcome,
} from '@/features/outlook-tools';
import { isThreadRunActive } from '@/features/thread-run';
import { useEmbedded } from '@/shared/contexts/embedded/embeddedContext';
import { resolvePiiTokens } from '@/widgets/markdown';
import { outlookAttachmentSourceApi } from '@/pages/chat/api/outlook-attachment-source-api';
import type { Message } from '@/pages/chat/model/openapi';
import type {
  OutlookToolBridge,
  OutlookToolState,
} from '@/pages/chat/model/outlook-tool-bridge';

interface ToolResult {
  toolId: string;
  toolName: string;
  result: string;
}

interface UseOutlookToolBridgeParams {
  threadId: string;
  messages: readonly Message[];
  isStreaming: boolean;
  isCheckingForRun: boolean;
  piiMasks: readonly PiiMask[];
  sendToolResult: (result: ToolResult) => Promise<void>;
}

interface PiiMask {
  token: string;
  value: string;
}

type Execute = (call: OutlookToolCall) => Promise<OutlookToolOutcome>;

interface TrackedToolState {
  state: OutlookToolState;
  replyItem?: unknown;
}

function ignoreOutlookItem(): () => void {
  return () => undefined;
}

/**
 * What goes into Outlook leaves the chat, so it carries the original values
 * of an anonymous chat's `{{pii:…}}` tokens, as a copied email does.
 */
function resolveParams(
  params: Record<string, unknown>,
  masks: ReadonlyMap<string, PiiMask>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      typeof value === 'string' ? resolvePiiTokens(value, masks) : value,
    ]),
  );
}

function callsOfLatestTurn(messages: readonly Message[]): OutlookToolCall[] {
  const latestUserMessage = messages
    .map(({ role }) => role)
    .lastIndexOf('user');
  return outlookToolCalls(messages.slice(latestUserMessage + 1));
}

function latestDraftCallId(messages: readonly Message[]): string | undefined {
  return outlookToolCalls(messages)
    .reverse()
    .find(({ name }) => isOutlookDraftTool(name))?.id;
}

/** The read calls of the latest turn the run still waits for. */
function waitingReads(messages: readonly Message[]): OutlookToolCall[] {
  if (hasCallAwaitingConfirmation(messages)) return [];
  const answered = answeredToolCallIds(messages);
  return callsOfLatestTurn(messages).filter(
    ({ id, name }) => isAwaitingResultTool(name) && !answered.has(id),
  );
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

/**
 * Runs the Outlook calls of the run that just ended. A read call's result
 * goes back to the backend, which continues the run with it; the backend
 * answers a second read call of the same turn with `Not completed`.
 */
async function settleRun(
  calls: OutlookToolCall[],
  messages: readonly Message[],
  signal: AbortSignal,
  execute: Execute,
  runItemKey: string | null,
): Promise<ToolResult | null> {
  // The backend refuses a tool result while a sibling call waits for the
  // user's confirmation, so a turn with one is not the pane's to act on.
  if (hasCallAwaitingConfirmation(messages)) return null;
  const answered = answeredToolCallIds(messages);
  let next: ToolResult | null = null;
  for (const call of calls) {
    if (signal.aborted) return null;
    const awaiting = isAwaitingResultTool(call.name);
    const skip = awaiting
      ? answered.has(call.id) || next !== null
      : waitsForUser(call.name, runItemKey);
    if (skip) continue;
    const outcome = await execute(call);
    if (awaiting && outcome.status === 'result') {
      next = { toolId: call.id, toolName: call.name, result: outcome.result };
    }
  }
  return signal.aborted ? null : next;
}

/**
 * Runs the Outlook tools of the chat's runs in the Outlook pane. Only calls
 * made while the chat was open run: reopening a chat must not write an old
 * draft into the open email again. Outside the pane it does nothing.
 */
export function useOutlookToolBridge({
  threadId,
  messages,
  isStreaming,
  isCheckingForRun,
  piiMasks,
  sendToolResult,
}: UseOutlookToolBridgeParams) {
  const embedded = useEmbedded();
  const mailboxItem = useSyncExternalStore(
    embedded ? subscribeToOutlookItem : ignoreOutlookItem,
    currentOutlookMailboxItem,
  );
  const [toolStates, setToolStates] = useState<
    Partial<Record<string, TrackedToolState>>
  >({});
  const messagesRef = useRef(messages);
  const masksRef = useRef<ReadonlyMap<string, PiiMask>>(new Map());
  const handled = useRef(new Set<string>());
  const batch = useRef<AbortController | null>(null);
  // The mail the run started on; the tools refuse to act on another. A run
  // the chat did not start, such as one reattached after a reload, belongs
  // to the mail the chat was opened next to.
  const runOrigin = useRef<{
    itemKey: string | null;
    observingFromReply: boolean;
  }>({ itemKey: null, observingFromReply: false });
  const [endedRun, setEndedRun] = useState<{
    threadId: string;
    failed: boolean;
    reopened?: boolean;
  } | null>(null);
  const settledRun = useRef<typeof endedRun>(null);
  const activeThreadId = useRef<string | null>(null);
  // The mail each call was made for. A draft from read mode can only be
  // inserted into a reply to that mail.
  const [callItemKeys, setCallItemKeys] = useState<
    Record<string, string | null>
  >({});

  useLayoutEffect(() => {
    if (!embedded) return;
    activeThreadId.current = threadId;
    return () => {
      activeThreadId.current = null;
    };
  }, [embedded, threadId]);

  const runEnded = useCallback(
    (failed: boolean, reason?: 'reattach-failed') => {
      // An in-flight request retains its original callback across chat switches.
      if (activeThreadId.current !== threadId) return;
      setEndedRun((current) => {
        // A transport error tells us nothing about the saved call we reopened.
        if (
          reason === 'reattach-failed' &&
          current?.threadId === threadId &&
          current.reopened
        ) {
          return current;
        }
        return { threadId, failed };
      });
    },
    [threadId],
  );

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    masksRef.current = new Map(piiMasks.map((mask) => [mask.token, mask]));
  }, [piiMasks]);

  // Once per thread: StrictMode replays this effect after a new chat's first
  // run was taken over, which must not mark that run's calls handled again.
  const openedThreadId = useRef<string | null>(null);
  useEffect(() => {
    if (!embedded) return;
    if (openedThreadId.current !== threadId) {
      openedThreadId.current = threadId;
      const chatItem = chatItemKey(threadId);
      const itemKey =
        chatItem === undefined ? currentOutlookItemKey() : chatItem;
      runOrigin.current = {
        itemKey,
        observingFromReply:
          itemKey !== null && itemKey === currentOutlookReplySourceKey(),
      };
      // A read the run still waits for, because the user left the chat
      // before it was answered, is answered on return to the same mail.
      // Drafts are never replayed.
      const sameMail =
        Boolean(chatItem) && chatItem === currentOutlookItemKey();
      const waiting = new Set(
        sameMail ? waitingReads(messagesRef.current).map(({ id }) => id) : [],
      );
      handled.current = new Set(
        outlookToolCalls(messagesRef.current)
          .map(({ id }) => id)
          .filter((id) => !waiting.has(id)),
      );
      if (waiting.size > 0) {
        setEndedRun({ threadId, failed: false, reopened: true });
      }
    }
    return () => batch.current?.abort();
  }, [embedded, threadId]);

  const execute = useCallback(
    async (
      call: OutlookToolCall,
      options: {
        signal?: AbortSignal;
        expectedItemKey?: string | null;
        expectedReplySourceKey?: string;
      } = {},
    ) => {
      const running: TrackedToolState = { state: { status: 'running' } };
      if (options.expectedReplySourceKey !== undefined) {
        running.replyItem = currentOutlookMailboxItem();
      }
      setToolStates((current) => ({ ...current, [call.id]: running }));
      const params = resolveParams(call.params, masksRef.current);
      const outcome = await executeOutlookTool(call.name, params, {
        extractAttachmentText: (file) =>
          addAttachmentAsSource(
            outlookAttachmentSourceApi,
            threadId,
            file,
            options.signal,
          ),
        expectedItemKey: options.expectedItemKey,
        expectedReplySourceKey: options.expectedReplySourceKey,
        draftId: call.id,
      });
      setToolStates((current) =>
        current[call.id] === running
          ? { ...current, [call.id]: { ...running, state: outcome } }
          : current,
      );
      return outcome;
    },
    [threadId],
  );

  useEffect(() => {
    if (!embedded || endedRun?.threadId !== threadId || isStreaming) return;
    if (settledRun.current === endedRun) return;
    if (endedRun.reopened && isCheckingForRun) return;
    // Reattach registers its stream before React can publish isStreaming.
    if (isThreadRunActive(threadId)) return;
    settledRun.current = endedRun;
    const { itemKey: runItem, observingFromReply } = runOrigin.current;
    // A separate compose pane observes the original run. The pane that
    // started it must still return the item-changed result after a switch.
    if (observingFromReply && runItem === currentOutlookReplySourceKey())
      return;
    const candidates = endedRun.reopened
      ? waitingReads(messagesRef.current)
      : outlookToolCalls(messagesRef.current);
    const calls = candidates.filter(({ id }) => !handled.current.has(id));
    calls.forEach(({ id }) => handled.current.add(id));
    if (endedRun.failed || calls.length === 0) return;
    const latestDraft = calls
      .filter(({ name }) => isOutlookDraftTool(name))
      .at(-1);
    if (latestDraft) {
      rememberOutlookDraftSource(threadId, latestDraft.id, runItem);
    }
    setCallItemKeys((current) => ({
      ...current,
      ...Object.fromEntries(calls.map(({ id }) => [id, runItem])),
    }));
    const controller = new AbortController();
    batch.current = controller;
    // A run that started with no mail open must not write into one opened
    // since, so null is a mail to check against too.
    const expectedItemKey = runItem;
    void settleRun(
      calls,
      messagesRef.current,
      controller.signal,
      (call) => execute(call, { signal: controller.signal, expectedItemKey }),
      runItem,
    ).then((result) => result && sendToolResult(result));
  }, [
    embedded,
    endedRun,
    isStreaming,
    isCheckingForRun,
    threadId,
    execute,
    sendToolResult,
  ]);

  /**
   * Before the user's message is sent: a new turn supersedes the last. A new
   * chat's first message was sent before this page opened, and the run may
   * have saved its calls before the thread was loaded; they are this run's.
   */
  const beginRun = useCallback(
    ({ takesOverStartedRun = false } = {}) => {
      if (!embedded) return;
      batch.current?.abort();
      outlookToolCalls(messagesRef.current).forEach(({ id }) =>
        handled.current.add(id),
      );
      if (takesOverStartedRun) {
        callsOfLatestTurn(messagesRef.current).forEach(({ id }) =>
          handled.current.delete(id),
        );
      }
      runOrigin.current = {
        itemKey: itemKeyForRun(threadId, takesOverStartedRun),
        observingFromReply: false,
      };
    },
    [embedded, threadId],
  );

  // A recorded draft keeps its own source across panes. For an older chat
  // with no record, only the latest turn can use the chat's current email.
  const latestDraftId = useMemo(() => latestDraftCallId(messages), [messages]);
  const replyItemKey = useCallback(
    (toolCallId: string): string | null => {
      if (toolCallId !== latestDraftId) return null;
      if (toolCallId in callItemKeys) return callItemKeys[toolCallId];
      const storedSource = outlookDraftSource(threadId, toolCallId);
      if (storedSource !== undefined) return storedSource;
      const belongsToLatestTurn = callsOfLatestTurn(messages).some(
        ({ id }) => id === toolCallId,
      );
      return belongsToLatestTurn ? (chatItemKey(threadId) ?? null) : null;
    },
    [callItemKeys, latestDraftId, messages, threadId],
  );

  const openItemKey = embedded ? currentOutlookItemKey() : null;
  const replySourceKey = embedded ? currentOutlookReplySourceKey() : null;
  const bridge = useMemo<OutlookToolBridge | null>(() => {
    if (!embedded) return null;
    return {
      stateFor: (toolCallId) => {
        const tracked = toolStates[toolCallId];
        if (
          tracked &&
          'replyItem' in tracked &&
          tracked.replyItem !== mailboxItem
        ) {
          return undefined;
        }
        return tracked?.state;
      },
      draftAction: ({ id, name }) => {
        const source = replyItemKey(id);
        if (!source || !waitsForUser(name, source)) return null;
        if (source === replySourceKey) return 'insert';
        return source === openItemKey ? 'openReply' : null;
      },
      insertDraft: (call) => {
        if (call.id !== latestDraftCallId(messagesRef.current)) return;
        const source = replyItemKey(call.id);
        if (!source || !waitsForUser(call.name, source)) return;
        void execute(
          { ...call, name: OUTLOOK_TOOL.moveEmailToComposer },
          { expectedReplySourceKey: source },
        );
      },
    };
  }, [
    embedded,
    openItemKey,
    replySourceKey,
    mailboxItem,
    toolStates,
    replyItemKey,
    execute,
  ]);

  return { bridge, beginRun, runEnded };
}
