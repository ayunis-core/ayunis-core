import type { ReactNode } from 'react';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import type { ChatConfig, ChatEvents } from './chat-config';
import type { ClientToolDispatch } from './client-tool-dispatch';
import type { RunEndpoints } from './run-endpoints';
import type { ChatRunLifecycle } from './run-lifecycle';
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

export interface ConversationProps<Context = unknown, Outcome = unknown> {
  readonly config: ChatConfig<Context, Outcome>;
  readonly threadId: string;
  /** Shares runs with the host's own new-chat start; owned by the conversation otherwise. */
  readonly lifecycle?: ChatRunLifecycle;
  /** Shown for a chat without messages. */
  readonly emptyState?: ReactNode;
}

export interface ChatActiveRunSnapshot {
  readonly run?: { readonly cancellable: boolean };
  readonly dataUpdatedAt: number;
  readonly isFetching: boolean;
}

export type ConversationRuntimeAdapters = Pick<
  ChatEvents,
  | 'onThreadState'
  | 'onRunError'
  | 'onRunSettled'
  | 'observeRun'
  | 'onMessageCopied'
  | 'onUnauthorized'
  | 'onError'
> & {
  readonly onMessageReceived?: (threadId: string) => void;
  readonly onStartedRun?: (
    threadId: string,
    run: StartedThreadRun,
    messageAlreadyLoaded: boolean,
  ) => void;
};

/** The run-facing view of a conversation, with the config's events folded in. */
export interface ConversationRuntime<Context = unknown, Outcome = unknown> {
  readonly thread: ChatThreadSnapshot;
  readonly transport: RunEndpoints;
  readonly adapters: ConversationRuntimeAdapters;
  readonly clientTools?: ClientToolDispatch<Context, Outcome>;
  readonly activeRun?: ChatActiveRunSnapshot;
}
