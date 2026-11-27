import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import {
  createMemoryChatDraftStorage,
  useChatDraft,
  type ChatDraftStorage,
} from '@ayunis/chat/composer';
import { ChatSurface } from './chat-surface';
import type {
  ConversationProps,
  ConversationRuntime,
  ConversationRuntimeAdapters,
} from './chat-conversation-config';
import type { ConfiguredComposerRef } from './configured-composer-types';
import { ConversationComposer } from './conversation-composer';
import { ConversationHeader } from './conversation-header';
import {
  ChatConversationContent,
  useConversationTimeline,
} from './chat-conversation-content';
import {
  ConversationLoadError,
  ConversationLoading,
} from './conversation-states';
import { createChatRunLifecycle, type ChatRunLifecycle } from './run-lifecycle';
import {
  sourceProcessingRun,
  sourceProcessingSteps,
} from './source-processing-steps';
import { useConversationRun } from './use-conversation-run';
import { useConversationSubmission } from './use-conversation-submission';
import {
  hasProcessingSource,
  useActiveRun,
  useConversationThread,
  useSourceProcessingProgress,
} from './use-conversation-thread';

/** An existing chat: its header, messages and composer, loaded by the package. */
export function Conversation<Context, Outcome>(
  props: ConversationProps<Context, Outcome>,
) {
  return <ConversationSession key={props.config.sessionKey} {...props} />;
}

function ConversationSession<Context, Outcome>(
  props: ConversationProps<Context, Outcome>,
) {
  const [ownedLifecycle] = useState(() =>
    createChatRunLifecycle(props.config.transport),
  );
  const [memoryDrafts] = useState(createMemoryChatDraftStorage);
  useSessionCleanup(ownedLifecycle);
  return (
    <ConversationLoader
      {...props}
      lifecycle={props.lifecycle ?? ownedLifecycle}
      drafts={props.config.drafts ?? memoryDrafts}
    />
  );
}

function useSessionCleanup(lifecycle: ChatRunLifecycle) {
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Strict Mode also replays mount effects without removing the session.
      queueMicrotask(() => {
        if (!mounted.current) lifecycle.reset();
      });
    };
  }, [lifecycle]);
}

type SessionProps<Context, Outcome> = ConversationProps<Context, Outcome> & {
  readonly lifecycle: ChatRunLifecycle;
  readonly drafts: ChatDraftStorage;
};

function useIsThreadStreaming(lifecycle: ChatRunLifecycle, threadId: string) {
  return useSyncExternalStore(
    lifecycle.subscribeToActiveThreadRuns,
    lifecycle.getActiveThreadRunIds,
    lifecycle.getActiveThreadRunIds,
  ).has(threadId);
}

function ConversationLoader<Context, Outcome>(
  props: SessionProps<Context, Outcome>,
) {
  const isStreaming = useIsThreadStreaming(props.lifecycle, props.threadId);
  const query = useConversationThread(props.threadId, isStreaming);
  if (query.data?.id === props.threadId) {
    return <ConversationView {...props} thread={query.data} />;
  }
  if (query.isError) {
    return (
      <ConversationLoadError
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }
  return <ConversationLoading />;
}

type ViewProps<Context, Outcome> = SessionProps<Context, Outcome> & {
  readonly thread: GetThreadResponseDto;
};

/** Mirrors the shared run lifecycle into the thread's submission state. */
function useSubmissionAdapters(
  props: ViewProps<unknown, unknown>,
): ConversationRuntimeAdapters {
  const { lifecycle, config } = props;
  const { events } = config;
  const onStartedRun = useCallback<
    NonNullable<ConversationRuntimeAdapters['onStartedRun']>
  >(
    (threadId, run, messageAlreadyLoaded) => {
      lifecycle.startSubmission(threadId, {
        text: run.text,
        images: run.images,
      });
      if (messageAlreadyLoaded) lifecycle.clearPendingSubmission(threadId);
    },
    [lifecycle],
  );
  return {
    onThreadState: events.onThreadState,
    onRunError: events.onRunError,
    observeRun: events.observeRun,
    onMessageCopied: events.onMessageCopied,
    onUnauthorized: events.onUnauthorized,
    onError: events.onError,
    onMessageReceived: lifecycle.clearPendingSubmission,
    onStartedRun,
    onRunSettled: (threadId, outcome) => {
      lifecycle.completeSubmission(threadId, outcome.failed);
      events.onRunSettled?.(threadId, outcome);
    },
  };
}

function useConversationRuntime<Context, Outcome>(
  props: ViewProps<Context, Outcome>,
): ConversationRuntime<Context, Outcome> {
  const adapters = useSubmissionAdapters(props as ViewProps<unknown, unknown>);
  const activeRun = useActiveRun(props.lifecycle, props.thread.id);
  return {
    thread: props.thread,
    activeRun,
    transport: props.config.transport,
    clientTools: props.config.clientTools,
    adapters,
  };
}

function useProcessingActivity(thread: GetThreadResponseDto) {
  const processing = hasProcessingSource(thread);
  const progress = useSourceProcessingProgress(thread.id, processing);
  const steps = sourceProcessingSteps(thread.sources, progress.data);
  return {
    processing,
    unit: steps.length > 0 ? sourceProcessingRun(steps) : undefined,
  };
}

function useConversationView<Context, Outcome>(
  props: ViewProps<Context, Outcome>,
) {
  const { thread, lifecycle, drafts, config } = props;
  const run = useConversationRun(lifecycle, useConversationRuntime(props));
  const composerRef = useRef<ConfiguredComposerRef>(null);
  const activity = useProcessingActivity(thread);
  const submission = useConversationSubmission(lifecycle, {
    threadId: thread.id,
    isStreaming: run.isStreaming,
    hasProcessingSources: activity.processing,
    restore: ({ text, images }) =>
      composerRef.current?.restoreFailedSubmission(text, [...(images ?? [])]),
    resumeStartedRun: run.resumeStartedRun,
  });
  const timeline = useConversationTimeline(
    config.toolCards,
    config.events.onCodeCopied,
    config.clientTools?.registry,
  );
  const draft = useChatDraft(thread.id, drafts);
  return { run, draft, composerRef, activity, submission, timeline };
}

function ConversationView<Context, Outcome>(
  props: ViewProps<Context, Outcome>,
) {
  const { thread, lifecycle, config } = props;
  const view = useConversationView(props);
  const { run, submission, activity } = view;
  return (
    <ChatSurface
      resetKey={thread.id}
      header={
        <ConversationHeader
          config={config}
          lifecycle={lifecycle}
          thread={thread}
          title={run.threadTitle}
        />
      }
      content={
        <ChatConversationContent
          config={config}
          threadId={thread.id}
          messages={run.messages}
          masks={run.piiMasks}
          isStreaming={run.isStreaming}
          canDecide={!run.isStreaming && !run.isCheckingForRun}
          decide={run.sendToolCallDecisions}
          timeline={view.timeline}
          pendingSubmission={submission.pendingSubmission}
          processing={activity.unit}
          showOrb={!activity.processing}
        />
      }
      composer={<ViewComposer key={thread.id} props={props} view={view} />}
    />
  );
}

function ViewComposer<Context, Outcome>({
  props,
  view,
}: Readonly<{
  props: ViewProps<Context, Outcome>;
  view: ReturnType<typeof useConversationView<Context, Outcome>>;
}>) {
  return (
    <ConversationComposer
      run={view.run}
      config={props.config}
      lifecycle={props.lifecycle}
      thread={props.thread}
      draft={view.draft}
      composerRef={view.composerRef}
      pendingSubmission={view.submission.pendingSubmission}
      isDeferred={view.submission.isDeferred}
      hasProcessingSources={view.activity.processing}
    />
  );
}
