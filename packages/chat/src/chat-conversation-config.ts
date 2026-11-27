import type { ReactNode, Ref, RefObject } from 'react';
import type {
  GetThreadResponseDto,
  ImageMessageContentResponseDto,
  RunErrorResponseDto,
} from '@ayunis/api-client/schemas';
import type { PiiUnmaskRequestHandler } from '@ayunis/chat/markdown';
import type { AgentRunUnit } from '@ayunis/chat/timeline';
import type { ChatConfig, ChatEvents } from './chat-config';
import type { ChatSlots } from './chat-surface-config';
import type { ClientToolDispatch } from './client-tool-dispatch';
import type { RunEndpoints } from './run-endpoints';
import type { ChatRunLifecycle } from './run-lifecycle';
import type { SendMessageInput } from './use-chat-run-lifecycle';
import type { StartedThreadRun } from './started-thread-run';

export type ChatThreadSnapshot = Pick<
  GetThreadResponseDto,
  'id' | 'title' | 'messages' | 'piiMasks'
> &
  Partial<
    Pick<
      GetThreadResponseDto,
      | 'sources'
      | 'isAnonymous'
      | 'mode'
      | 'permittedModelId'
      | 'modelId'
      | 'isLongChat'
    >
  >;

export interface ChatConversationAdapters {
  readonly onThreadState?: (thread: ChatThreadSnapshot) => void;
  /** Handles request/stream failures instead of `events.onError`. */
  readonly onRunTransportError?: (error: Error) => void;
  readonly onRunError?: (error: RunErrorResponseDto) => void;
  readonly onPiiUnmaskRequest?: PiiUnmaskRequestHandler;
  readonly onMessageReceived?: (threadId: string) => void;
  readonly onStartedRun?: (
    threadId: string,
    run: StartedThreadRun,
    messageAlreadyLoaded: boolean,
  ) => void;
  /** Returns true when host-owned context has queued this send until it is ready. */
  readonly deferSend?: (threadId: string, input: SendMessageInput) => boolean;
  /** Returns true when a host-queued send was cancelled. */
  readonly cancelDeferredSend?: (threadId: string) => boolean;
  readonly onRunStopped?: (threadId: string) => void;
}

export interface ChatConversationHandle {
  readonly restoreFailedSubmission: (
    text: string,
    files: File[],
  ) => boolean | undefined;
  readonly resumeStartedRun: () => boolean;
}

export interface ChatConversationComposerConfig {
  /** Clears the submitted draft and pending images before the run responds. */
  readonly clearOnSend?: boolean;
  readonly deferredSendCancellable?: boolean;
}

export interface ChatConversationSlots extends ChatSlots {
  readonly contextHint?: ReactNode;
  readonly waiting?: ReactNode;
  readonly loading?: ReactNode;
  readonly pendingIndicator?: ReactNode;
  readonly assistantActions?: (
    unit: AgentRunUnit,
    contentRef: RefObject<HTMLDivElement | null>,
  ) => ReactNode;
  readonly messageImage?: (
    message: ChatThreadSnapshot['messages'][number],
    image: ImageMessageContentResponseDto,
  ) => ReactNode;
  readonly messageNudge?: (text: string) => ReactNode;
}

export interface ChatActiveRunSnapshot {
  readonly run?: { readonly cancellable: boolean };
  readonly dataUpdatedAt: number;
  readonly isFetching: boolean;
}

export interface ChatConversationProps<Context = unknown, Outcome = unknown> {
  readonly config: ChatConfig<Context, Outcome>;
  readonly lifecycle?: ChatRunLifecycle;
  readonly thread: ChatThreadSnapshot;
  readonly adapters?: ChatConversationAdapters;
  readonly slots?: ChatConversationSlots;
  readonly activeRun?: ChatActiveRunSnapshot;
  readonly pendingSubmission?: string | null;
  readonly composer?: ChatConversationComposerConfig;
  readonly conversationRef?: Ref<ChatConversationHandle>;
}

export type ConversationRuntimeAdapters = ChatConversationAdapters &
  Pick<
    ChatEvents,
    | 'onRunSettled'
    | 'observeRun'
    | 'onMessageCopied'
    | 'onUnauthorized'
    | 'onError'
  >;

/** The run-facing view of a conversation, with the config's events folded in. */
export interface ConversationRuntime<Context = unknown, Outcome = unknown> {
  readonly thread: ChatThreadSnapshot;
  readonly transport: RunEndpoints;
  readonly adapters: ConversationRuntimeAdapters;
  readonly clientTools?: ClientToolDispatch<Context, Outcome>;
  readonly activeRun?: ChatActiveRunSnapshot;
}
