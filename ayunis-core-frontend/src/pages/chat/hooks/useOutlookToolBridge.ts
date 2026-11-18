import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addAttachmentAsSource,
  answeredToolCallIds,
  chatItemKey,
  currentOutlookItemKey,
  executeOutlookTool,
  hasCallAwaitingConfirmation,
  isAwaitingResultTool,
  outlookToolCalls,
  rememberChatItem,
  waitsForUser,
  type OutlookToolCall,
  type OutlookToolOutcome,
} from '@/features/outlook-tools';
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
  piiMasks: readonly PiiMask[];
  sendToolResult: (result: ToolResult) => Promise<void>;
}

interface PiiMask {
  token: string;
  value: string;
}

type Execute = (call: OutlookToolCall) => Promise<OutlookToolOutcome>;

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
  piiMasks,
  sendToolResult,
}: UseOutlookToolBridgeParams) {
  const embedded = useEmbedded();
  const [toolStates, setToolStates] = useState<
    Record<string, OutlookToolState>
  >({});
  const messagesRef = useRef(messages);
  const masksRef = useRef<ReadonlyMap<string, PiiMask>>(new Map());
  const handled = useRef(new Set<string>());
  const batch = useRef<AbortController | null>(null);
  // The mail the run started on; the tools refuse to act on another. A run
  // the chat did not start, such as one reattached after a reload, belongs
  // to the mail the chat was opened next to.
  const runItemKey = useRef<string | null>(null);
  const endedRun = useRef<{ failed: boolean } | null>(null);
  const [runEnds, setRunEnds] = useState(0);
  // The mail each call of a run this page saw was made for. A draft opens a
  // reply only there, and a draft without one is not offered at all.
  const [callItemKeys, setCallItemKeys] = useState<
    Record<string, string | null>
  >({});

  const runEnded = useCallback(
    (failed: boolean) => {
      if (!embedded) return;
      endedRun.current = { failed };
      setRunEnds((count) => count + 1);
    },
    [embedded],
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
      runItemKey.current =
        chatItem === undefined ? currentOutlookItemKey() : chatItem;
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
      if (waiting.size > 0) runEnded(false);
    }
    return () => batch.current?.abort();
  }, [embedded, threadId, runEnded]);

  const execute = useCallback(
    async (
      call: OutlookToolCall,
      options: { signal?: AbortSignal; expectedItemKey?: string | null } = {},
    ) => {
      const setState = (state: OutlookToolState) =>
        setToolStates((current) => ({ ...current, [call.id]: state }));
      setState({ status: 'running' });
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
      });
      setState(outcome);
      return outcome;
    },
    [threadId],
  );

  useEffect(() => {
    const ended = endedRun.current;
    if (!embedded || !ended || isStreaming) return;
    endedRun.current = null;
    const calls = outlookToolCalls(messagesRef.current).filter(
      ({ id }) => !handled.current.has(id),
    );
    calls.forEach(({ id }) => handled.current.add(id));
    if (ended.failed || calls.length === 0) return;
    const runItem = runItemKey.current;
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
  }, [embedded, runEnds, isStreaming, execute, sendToolResult]);

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
      runItemKey.current = itemKeyForRun(threadId, takesOverStartedRun);
    },
    [embedded, threadId],
  );

  // The mail a draft opens a reply on: the one its run was about. After a
  // reload only the latest turn's drafts have one, the chat's mail, which is
  // the mail open at the latest message; older drafts are not offered.
  const replyItemKey = useCallback(
    (toolCallId: string): string | null => {
      if (toolCallId in callItemKeys) return callItemKeys[toolCallId];
      const latestTurn = callsOfLatestTurn(messages).some(
        ({ id }) => id === toolCallId,
      );
      return latestTurn ? (chatItemKey(threadId) ?? null) : null;
    },
    [callItemKeys, messages, threadId],
  );

  const bridge = useMemo<OutlookToolBridge | null>(
    () =>
      embedded
        ? {
            stateFor: (toolCallId) => toolStates[toolCallId],
            canOpenReply: ({ id, name }) =>
              waitsForUser(name, replyItemKey(id)),
            openReply: (call) => {
              const itemKey = replyItemKey(call.id);
              if (!itemKey || !waitsForUser(call.name, itemKey)) return;
              // A click after the user moved to another mail must not reply
              // there with a draft written for the mail it was made for.
              void execute(call, { expectedItemKey: itemKey });
            },
          }
        : null,
    [embedded, toolStates, replyItemKey, execute],
  );

  return { bridge, beginRun, runEnded };
}
