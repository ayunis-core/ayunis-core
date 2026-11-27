import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import {
  addAttachmentAsSource,
  chatItemKey,
  currentOutlookItemKey,
  currentOutlookMailboxItem,
  currentOutlookReplySourceKey,
  isOutlookDraftTool,
  openOutlookReply,
  outlookDraftSource,
  outlookToolCalls,
  OUTLOOK_TOOL,
  waitsForUser,
  subscribeToOutlookItem,
  type OutlookReplyRecipients,
  type OutlookToolCall,
  type OutlookToolDependencies,
  type OutlookToolOutcome,
} from '@/features/outlook-tools';
import { latestToolMessages } from '@ayunis/chat/runs';
import type { ClientToolCall, ClientToolExecutor } from '@ayunis/chat/surface';
import { resolvePiiTokens } from '@ayunis/chat/markdown';
import { outlookClientTools } from '@/outlook/model/outlook-client-tools';
import {
  useOutlookToolDispatch,
  type CallItemKeys,
} from '@/outlook/lib/use-outlook-tool-dispatch';
import { outlookAttachmentSourceApi } from '@/outlook/api/outlook-attachment-source-api';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
type Message = GetThreadResponseDto['messages'][number];
import type {
  OutlookToolBridge,
  OutlookToolState,
} from '@/outlook/model/outlook-tool-bridge';

interface UseOutlookToolBridgeParams {
  threadId: string;
  messages: readonly Message[];
  piiMasks: readonly PiiMask[];
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

type ToolStates = Partial<Record<string, TrackedToolState>>;

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

function useLatestGetter<T>(value: T): () => T {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return useCallback(() => ref.current, []);
}

function useMaskLookup(
  piiMasks: readonly PiiMask[],
): RefObject<ReadonlyMap<string, PiiMask>> {
  const masksRef = useRef<ReadonlyMap<string, PiiMask>>(new Map());
  useEffect(() => {
    masksRef.current = new Map(piiMasks.map((mask) => [mask.token, mask]));
  }, [piiMasks]);
  return masksRef;
}

/** Applies a call's outcome unless a newer execution of it took over. */
function settleToolState(
  setToolStates: Dispatch<SetStateAction<ToolStates>>,
  callId: string,
  running: TrackedToolState,
  settled: TrackedToolState | undefined,
): void {
  setToolStates((current) =>
    current[callId] === running ? { ...current, [callId]: settled } : current,
  );
}

function toolDependencies(
  threadId: string,
  callId: string,
  options: ExecutionOptions,
): OutlookToolDependencies {
  return {
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
    draftId: callId,
  };
}

type SetToolStates = Dispatch<SetStateAction<ToolStates>>;
type MaskLookup = RefObject<ReadonlyMap<string, PiiMask>>;

function useExecuteRegistered(
  threadId: string,
  masksRef: MaskLookup,
  setToolStates: SetToolStates,
) {
  return useCallback(
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
        toolDependencies(threadId, call.id, options),
      );
      settleToolState(
        setToolStates,
        call.id,
        running,
        options.signal?.aborted ? undefined : { ...running, state: outcome },
      );
      return outcome;
    },
    [threadId, masksRef, setToolStates],
  );
}

function useOpenReply(masksRef: MaskLookup, setToolStates: SetToolStates) {
  return useCallback(
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
      settleToolState(
        setToolStates,
        call.id,
        running,
        outcome.status === 'opened' ? undefined : { state: outcome },
      );
    },
    [masksRef, setToolStates],
  );
}

function useToolExecution(threadId: string, masksRef: MaskLookup) {
  const [toolStates, setToolStates] = useState<ToolStates>({});
  const executeRegistered = useExecuteRegistered(
    threadId,
    masksRef,
    setToolStates,
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
  const reply = useOpenReply(masksRef, setToolStates);
  return { toolStates, executeRegistered, execute, reply };
}

// A recorded draft keeps its own source across panes. For an older chat
// with no record, only the latest turn can use the chat's current email.
function useReplyItemKey(
  threadId: string,
  messages: readonly Message[],
  callItemKeys: CallItemKeys,
) {
  const latestDraftId = useMemo(() => latestDraftCallId(messages), [messages]);
  return useCallback(
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
}

function visibleToolState(
  tracked: TrackedToolState | undefined,
  mailboxItem: unknown,
): OutlookToolState | undefined {
  if (tracked && 'replyItem' in tracked && tracked.replyItem !== mailboxItem) {
    return undefined;
  }
  return tracked?.state;
}

interface ToolBridgeInputs extends Pick<
  ReturnType<typeof useToolExecution>,
  'toolStates' | 'execute' | 'reply'
> {
  replyItemKey: (toolCallId: string) => string | null;
  latestMessages: () => readonly Message[];
  mailboxItem: unknown;
  openItemKey: string | null;
  replySourceKey: string | null;
}

function createToolBridge({
  toolStates,
  execute,
  reply,
  replyItemKey,
  latestMessages,
  mailboxItem,
  openItemKey,
  replySourceKey,
}: ToolBridgeInputs): OutlookToolBridge {
  // Only the latest draft, still waiting for the user, can leave the chat.
  const draftSource = (call: OutlookToolCall) => {
    if (call.id !== latestDraftCallId(latestMessages())) return null;
    const source = replyItemKey(call.id);
    return source && waitsForUser(call.name, source) ? source : null;
  };
  return {
    stateFor: (toolCallId) =>
      visibleToolState(toolStates[toolCallId], mailboxItem),
    draftAction: ({ id, name }) => {
      const source = replyItemKey(id);
      if (!source || !waitsForUser(name, source)) return null;
      if (source === replySourceKey) return 'insert';
      return source === openItemKey ? 'reply' : null;
    },
    insertDraft: (call) => {
      const source = draftSource(call);
      if (!source) return;
      void execute(
        { ...call, name: OUTLOOK_TOOL.moveEmailToComposer },
        { expectedReplySourceKey: source },
      );
    },
    openReply: (call, recipients) => {
      const source = draftSource(call);
      if (source) void reply(call, recipients, source);
    },
  };
}

function useToolBridge(
  inputs: Omit<
    ToolBridgeInputs,
    'mailboxItem' | 'openItemKey' | 'replySourceKey'
  >,
): OutlookToolBridge | null {
  const mailboxItem = useSyncExternalStore(
    subscribeToOutlookItem,
    currentOutlookMailboxItem,
  );
  const openItemKey = currentOutlookItemKey();
  const replySourceKey = currentOutlookReplySourceKey();
  const { toolStates, execute, reply, replyItemKey, latestMessages } = inputs;
  return useMemo(
    () =>
      createToolBridge({
        toolStates,
        execute,
        reply,
        replyItemKey,
        latestMessages,
        mailboxItem,
        openItemKey,
        replySourceKey,
      }),
    [
      openItemKey,
      replySourceKey,
      mailboxItem,
      toolStates,
      replyItemKey,
      execute,
      reply,
      latestMessages,
    ],
  );
}

/**
 * Runs the Outlook tools of the chat's runs in the Outlook pane. Only calls
 * made while the chat was open run: reopening a chat must not write an old
 * draft into the open email again. Outside the pane it does nothing.
 */
export function useStandaloneOutlookTools({
  threadId,
  messages,
  piiMasks,
}: UseOutlookToolBridgeParams) {
  const latestMessages = useLatestGetter(messages);
  const masksRef = useMaskLookup(piiMasks);
  const { toolStates, executeRegistered, execute, reply } = useToolExecution(
    threadId,
    masksRef,
  );
  const { dispatch, callItemKeys } = useOutlookToolDispatch(
    threadId,
    executeRegistered,
  );
  const replyItemKey = useReplyItemKey(threadId, messages, callItemKeys);
  const bridge = useToolBridge({
    toolStates,
    execute,
    reply,
    replyItemKey,
    latestMessages,
  });
  return { bridge, dispatch };
}
