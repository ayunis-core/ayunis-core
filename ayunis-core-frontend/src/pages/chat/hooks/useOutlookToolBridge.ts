import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  addAttachmentAsSource,
  chatItemKey,
  currentOutlookItemKey,
  currentOutlookMailboxItem,
  currentOutlookReplySourceKey,
  isAwaitingResultTool,
  isOutlookDraftTool,
  isOutlookTool,
  openOutlookReply,
  outlookDraftSource,
  outlookToolCalls,
  OUTLOOK_TOOL,
  rememberChatItem,
  rememberOutlookDraftSource,
  waitsForUser,
  subscribeToOutlookItem,
  type OutlookReplyRecipients,
  type OutlookToolCall,
  type OutlookToolDependencies,
  type OutlookToolOutcome,
} from '@/features/outlook-tools';
import { threadRunLifecycle } from '@/features/thread-run';
import {
  useClientToolLifecycle,
  latestToolMessages,
  type RunMessagePayload,
} from '@ayunis/chat/runs';
import type { ClientToolCall, ClientToolExecutor } from '@ayunis/chat/surface';
import { useEmbedded } from '@/shared/contexts/embedded/embeddedContext';
import { resolvePiiTokens } from '@/widgets/markdown';
import { outlookClientTools } from '@/pages/chat/model/outlook-client-tools';
import { outlookAttachmentSourceApi } from '@/pages/chat/api/outlook-attachment-source-api';
import type { Message } from '@/pages/chat/model/openapi';
import type {
  OutlookToolBridge,
  OutlookToolState,
} from '@/pages/chat/model/outlook-tool-bridge';

interface UseOutlookToolBridgeParams {
  threadId: string;
  messages: readonly Message[];
  isStreaming: boolean;
  isCheckingForRun: boolean;
  piiMasks: readonly PiiMask[];
  sendToolResult: (
    result: NonNullable<RunMessagePayload['toolResult']>,
  ) => Promise<void>;
}

interface PiiMask {
  token: string;
  value: string;
}

type Executor = ClientToolExecutor<OutlookToolDependencies, OutlookToolOutcome>;

interface ExecutionOptions {
  signal?: AbortSignal;
  expectedItemKey?: string | null;
  expectedReplySourceKey?: string;
}

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
  return outlookToolCalls(latestToolMessages(messages));
}

function latestDraftCallId(messages: readonly Message[]): string | undefined {
  return outlookToolCalls(messages)
    .reverse()
    .find(({ name }) => isOutlookDraftTool(name))?.id;
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
  // The mail the run started on; the tools refuse to act on another. A run
  // the chat did not start, such as one reattached after a reload, belongs
  // to the mail the chat was opened next to.
  const runOrigin = useRef<{
    itemKey: string | null;
    observingFromReply: boolean;
  }>({ itemKey: null, observingFromReply: false });
  // The mail each call was made for. A draft from read mode can only be
  // inserted into a reply to that mail.
  const [callItemKeys, setCallItemKeys] = useState<
    Record<string, string | null>
  >({});

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    masksRef.current = new Map(piiMasks.map((mask) => [mask.token, mask]));
  }, [piiMasks]);

  const executeRegistered = useCallback(
    async (
      executeTool: Executor,
      call: ClientToolCall,
      options: ExecutionOptions = {},
    ): Promise<OutlookToolOutcome> => {
      const running: TrackedToolState = { state: { status: 'running' } };
      if (options.expectedReplySourceKey !== undefined) {
        running.replyItem = currentOutlookMailboxItem();
      }
      setToolStates((current) => ({ ...current, [call.id]: running }));
      const params = resolveParams(call.params, masksRef.current);
      const outcome = await executeTool(
        { ...call, params },
        {
          extractAttachmentText: (file) =>
            addAttachmentAsSource(
              outlookAttachmentSourceApi,
              threadId,
              file,
              options.signal,
            ),
          signal: options.signal,
          expectedItemKey: options.expectedItemKey,
          expectedReplySourceKey: options.expectedReplySourceKey,
          draftId: call.id,
        },
      );
      setToolStates((current) =>
        current[call.id] === running
          ? {
              ...current,
              [call.id]: options.signal?.aborted
                ? undefined
                : { ...running, state: outcome },
            }
          : current,
      );
      return outcome;
    },
    [threadId],
  );

  const execute = useCallback(
    async (
      call: OutlookToolCall,
      options: ExecutionOptions,
    ): Promise<OutlookToolOutcome> => {
      const executor = outlookClientTools.get(call.name)?.execute;
      return executor
        ? executeRegistered(executor, call, options)
        : { status: 'failed', failure: 'officeFailed' };
    },
    [executeRegistered],
  );

  const reply = useCallback(
    async (
      call: OutlookToolCall,
      recipients: OutlookReplyRecipients,
      expectedItemKey: string,
    ) => {
      const running: TrackedToolState = { state: { status: 'running' } };
      setToolStates((current) => ({ ...current, [call.id]: running }));
      const { body } = resolveParams(call.params, masksRef.current);
      const outcome = await openOutlookReply(
        recipients,
        typeof body === 'string' ? body : '',
        { expectedItemKey, draftId: call.id },
      );
      setToolStates((current) =>
        current[call.id] === running
          ? {
              ...current,
              [call.id]:
                outcome.status === 'opened' ? undefined : { state: outcome },
            }
          : current,
      );
    },
    [],
  );

  const { beginRun, runEnded } = useClientToolLifecycle(threadRunLifecycle, {
    threadId,
    messages,
    isStreaming,
    isCheckingForRun,
    sendToolResult,
    dispatch: embedded
      ? {
          registry: outlookClientTools,
          expectsResult: ({ name }) => isAwaitingResultTool(name),
          resumeOnOpen() {
            const chatItem = chatItemKey(threadId);
            const itemKey =
              chatItem === undefined ? currentOutlookItemKey() : chatItem;
            runOrigin.current = {
              itemKey,
              observingFromReply:
                itemKey !== null && itemKey === currentOutlookReplySourceKey(),
            };
            // Reopening can continue a read on the same mail. Earlier writes stay handled.
            return Boolean(chatItem) && chatItem === currentOutlookItemKey();
          },
          onBeginRun(takesOverStartedRun) {
            runOrigin.current = {
              itemKey: itemKeyForRun(threadId, takesOverStartedRun),
              observingFromReply: false,
            };
          },
          canDispatch() {
            const { itemKey, observingFromReply } = runOrigin.current;
            // A separate reply pane can observe the original run without executing it.
            return (
              !observingFromReply || itemKey !== currentOutlookReplySourceKey()
            );
          },
          shouldExecute({ name }) {
            return (
              isOutlookTool(name) &&
              !waitsForUser(name, runOrigin.current.itemKey)
            );
          },
          onCalls(calls) {
            const { itemKey } = runOrigin.current;
            const latestDraft = calls
              .filter(
                ({ name }) => isOutlookTool(name) && isOutlookDraftTool(name),
              )
              .at(-1);
            if (latestDraft)
              rememberOutlookDraftSource(threadId, latestDraft.id, itemKey);
            setCallItemKeys((current) => ({
              ...current,
              ...Object.fromEntries(calls.map(({ id }) => [id, itemKey])),
            }));
          },
          async invoke(executor, call, signal) {
            const outcome = await executeRegistered(executor, call, {
              signal,
              expectedItemKey: runOrigin.current.itemKey,
            });
            return outcome.status === 'result' ? outcome.result : undefined;
          },
        }
      : undefined,
  });

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
        return source === openItemKey ? 'reply' : null;
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
      openReply: (call, recipients) => {
        if (call.id !== latestDraftCallId(messagesRef.current)) return;
        const source = replyItemKey(call.id);
        if (!source || !waitsForUser(call.name, source)) return;
        void reply(call, recipients, source);
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
    reply,
  ]);

  return { bridge, beginRun, runEnded };
}
