import type { ComponentType, ReactNode, Ref, RefObject } from 'react';
import type {
  GetThreadResponseDto,
  ImageMessageContentResponseDto,
  RunErrorResponseDto,
} from '@ayunis/api-client/schemas';
import type { ChatDraftStorage } from '@ayunis/chat/composer';
import type {
  MarkdownProps,
  PiiUnmaskRequestHandler,
} from '@ayunis/chat/markdown';
import type { AgentRunUnit, TimelinePresentation } from '@ayunis/chat/timeline';
import type { ChatSlots, ChatSurfaceConfig } from './chat-surface-config';
import type { ClientToolDispatch } from './client-tool-dispatch';
import type { ChatRunLifecycle } from './run-lifecycle';
import type { RunExecutionRequest, RunOutcome } from './run-execution';
import type { RunRequestObserver } from './run-lifecycle';
import type { SendMessageInput } from './use-chat-run-lifecycle';
import type { StartedThreadRun } from './started-thread-run';

export type ChatThreadSnapshot = Pick<
  GetThreadResponseDto,
  'id' | 'title' | 'messages' | 'piiMasks'
>;

export interface ChatModelAdapter {
  readonly selected?: string;
  readonly available: readonly { id: string; name: string }[];
  readonly select: (
    threadId: string,
    modelId: string,
    signal: AbortSignal,
  ) => Promise<void>;
}

export interface ChatConversationAdapters {
  readonly drafts?: ChatDraftStorage;
  readonly isSendDisabled?: boolean;
  readonly imageAttachments?: boolean;
  readonly documentAttachments?: boolean;
  /** Keeps attachment selection available for the next draft while a run streams. */
  readonly allowAttachmentsWhileStreaming?: boolean;
  readonly onAttachmentError?: (error: Error) => void;
  readonly uploadFiles?: (
    threadId: string,
    files: File[],
    signal: AbortSignal,
  ) => Promise<void>;
  readonly transcribe?: (
    audio: Blob,
    filename: string,
    signal: AbortSignal,
  ) => Promise<string | null>;
  readonly model?: ChatModelAdapter;
  readonly onThreadState?: (thread: ChatThreadSnapshot) => void;
  readonly onRunSettled?: (threadId: string, outcome: RunOutcome) => void;
  /** Handles request/stream failures without replacing composer-control errors. */
  readonly onRunTransportError?: (error: Error) => void;
  readonly observeRun?: (
    request: RunExecutionRequest,
    voiceInput: boolean,
    onError?: (error: Error) => void,
  ) => RunRequestObserver | undefined;
  readonly onRunError?: (error: RunErrorResponseDto) => void;
  readonly onPiiUnmaskRequest?: PiiUnmaskRequestHandler;
  readonly onMessageCopied?: (role: 'user' | 'assistant') => void;
  readonly onMessageReceived?: (threadId: string) => void;
  readonly onStartedRun?: (
    threadId: string,
    run: StartedThreadRun,
    messageAlreadyLoaded: boolean,
  ) => void;
  readonly onUnauthorized?: () => void;
  readonly onError?: (error: unknown) => void;
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
  readonly unavailableModel?: { readonly onNewChat: () => void };
  /** Clears the submitted draft and pending images before the run responds. */
  readonly clearOnSend?: boolean;
  readonly fileInputTestId?: string;
  readonly stopTestId?: string;
  readonly deferredSendCancellable?: boolean;
}

export interface ChatConversationSlots extends ChatSlots {
  readonly attachments?: ReactNode;
  readonly contextHint?: ReactNode;
  readonly waiting?: ReactNode;
  readonly loading?: ReactNode;
  readonly assistantActions?: (
    unit: AgentRunUnit,
    contentRef: RefObject<HTMLDivElement | null>,
  ) => ReactNode;
  readonly composerLeading?: ReactNode;
  readonly composerModel?: ReactNode;
  readonly composerNotice?: ReactNode;
  readonly composerFrame?: (content: ReactNode) => ReactNode;
  readonly composerAttachmentControl?: (content: ReactNode) => ReactNode;
  readonly composerVoiceControl?: (content: ReactNode) => ReactNode;
  readonly composerSendControl?: (content: ReactNode) => ReactNode;
  readonly messageImage?: (
    message: ChatThreadSnapshot['messages'][number],
    image: ImageMessageContentResponseDto,
  ) => ReactNode;
  readonly messageNudge?: (text: string) => ReactNode;
  readonly messageMarkdown?: ComponentType<MarkdownProps>;
  readonly skills?: ReactNode;
  readonly knowledgeBases?: ReactNode;
  readonly integrations?: ReactNode;
}

export interface ChatConversationProps<Context = unknown, Outcome = unknown> {
  /** Change this when the authenticated principal changes. Scope supplied data and storage to the same principal. */
  readonly sessionKey: string;
  readonly compactComposer?: boolean;
  readonly config: ChatSurfaceConfig;
  readonly lifecycle?: ChatRunLifecycle;
  readonly thread: ChatThreadSnapshot;
  readonly adapters?: ChatConversationAdapters;
  readonly slots?: ChatConversationSlots;
  readonly activeRun?: {
    readonly run?: { readonly cancellable: boolean };
    readonly dataUpdatedAt: number;
    readonly isFetching: boolean;
  };
  readonly clientTools?: ClientToolDispatch<Context, Outcome>;
  readonly timeline?: TimelinePresentation;
  readonly pendingSubmission?: string | null;
  readonly composer?: ChatConversationComposerConfig;
  readonly conversationRef?: Ref<ChatConversationHandle>;
}
