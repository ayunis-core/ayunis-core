import {
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type RefObject,
} from 'react';
import {
  createMemoryChatDraftStorage,
  useChatDraft,
  type ChatDraftStorage,
} from '@ayunis/chat/composer';
import { ConfiguredComposer } from './configured-composer';
import { ChatSurface } from './chat-surface';
import type {
  ChatConversationProps,
  ConversationRuntime,
} from './chat-conversation-config';
import type {
  ComposerConfig,
  ConfiguredComposerRef,
} from './configured-composer-types';
import type { ChatConfig } from './chat-config';
import { UnavailableModelNotice } from './model-presentation/UnavailableModelNotice';
import {
  ChatConversationContent,
  useConversationTimeline,
} from './chat-conversation-content';
import { createChatRunLifecycle, type ChatRunLifecycle } from './run-lifecycle';
import { useConversationRun } from './use-conversation-run';
import { sentPrompts } from '@ayunis/chat/messages';
import type { ChatSlots } from './chat-surface-config';
import { ThreadComposerNotices, useThreadComposer } from './thread-composer';

export function ChatConversation<Context, Outcome>(
  props: ChatConversationProps<Context, Outcome>,
) {
  return <ConversationSession key={props.config.sessionKey} {...props} />;
}

function ConversationSession<Context, Outcome>(
  props: ChatConversationProps<Context, Outcome>,
) {
  const [ownedLifecycle] = useState(() =>
    createChatRunLifecycle(props.config.transport),
  );
  const [memoryDrafts] = useState(createMemoryChatDraftStorage);
  useSessionCleanup(ownedLifecycle);
  return (
    <ConversationView
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

type ConversationViewProps<Context, Outcome> = ChatConversationProps<
  Context,
  Outcome
> & {
  lifecycle: ChatRunLifecycle;
  drafts: ChatDraftStorage;
};

function conversationRuntime<Context, Outcome>({
  config,
  thread,
  adapters,
  activeRun,
}: ChatConversationProps<Context, Outcome>): ConversationRuntime<
  Context,
  Outcome
> {
  const { events } = config;
  return {
    thread,
    activeRun,
    transport: config.transport,
    clientTools: config.clientTools,
    adapters: {
      ...adapters,
      onRunSettled: events.onRunSettled,
      observeRun: events.observeRun,
      onMessageCopied: events.onMessageCopied,
      onUnauthorized: events.onUnauthorized,
      onError: events.onError,
    },
  };
}

function ConversationView<Context, Outcome>(
  props: ConversationViewProps<Context, Outcome>,
) {
  const { thread, slots, lifecycle, drafts, config } = props;
  const runtime = conversationRuntime(props);
  const run = useConversationRun(lifecycle, runtime);
  const draft = useChatDraft(thread.id, drafts);
  const composerRef = useRef<ConfiguredComposerRef>(null);
  useImperativeHandle(props.conversationRef, () => ({
    restoreFailedSubmission: (text, files) =>
      composerRef.current?.restoreFailedSubmission(text, files),
    resumeStartedRun: run.resumeStartedRun,
  }));
  const timeline = useConversationTimeline(
    config.toolCards,
    slots?.pendingIndicator,
    config.events.onCodeCopied,
    config.clientTools?.registry,
  );
  return (
    <ChatSurface
      resetKey={thread.id}
      slots={slots}
      empty={!run.messages.length && !run.isStreaming}
      renderContent={(onOpenArtifact) => (
        <ConversationContent
          view={props}
          run={run}
          timeline={timeline}
          onOpenArtifact={onOpenArtifact}
        />
      )}
      composer={
        <ConversationComposer
          key={thread.id}
          run={run}
          view={props}
          draft={draft}
          composerRef={composerRef}
        />
      }
    />
  );
}

function ConversationContent<Context, Outcome>({
  view,
  run,
  timeline,
  onOpenArtifact,
}: Readonly<{
  view: ChatConversationProps<Context, Outcome>;
  run: ReturnType<typeof useConversationRun<Context, Outcome>>;
  timeline: ReturnType<typeof useConversationTimeline>;
  onOpenArtifact: ChatSlots['onOpenArtifact'];
}>) {
  const slots = view.slots ?? {};
  return (
    <ChatConversationContent
      threadId={view.thread.id}
      messages={run.messages}
      masks={run.piiMasks}
      isStreaming={run.isStreaming}
      canDecide={!run.isStreaming && !run.isCheckingForRun}
      decide={run.sendToolCallDecisions}
      onOpenArtifact={onOpenArtifact}
      timeline={timeline}
      messageImage={slots.messageImage}
      messageNudge={slots.messageNudge}
      pendingSubmission={view.pendingSubmission ?? null}
      contextHint={slots.contextHint}
      waiting={slots.waiting}
      loading={slots.loading}
      assistantActions={slots.assistantActions}
      onPiiUnmaskRequest={view.adapters?.onPiiUnmaskRequest}
      onMessageCopied={view.config.events.onMessageCopied}
    />
  );
}

type ConversationComposerProps = Readonly<{
  run: ReturnType<typeof useConversationRun>;
  view: Pick<
    ChatConversationProps,
    'adapters' | 'thread' | 'composer' | 'pendingSubmission'
  > & {
    readonly config: ComposerConfig & Pick<ChatConfig, 'transport' | 'events'>;
    readonly lifecycle: ChatRunLifecycle;
  };
  draft: ComponentProps<typeof ConfiguredComposer>['draft'];
  composerRef: RefObject<ConfiguredComposerRef | null>;
}>;

function ConversationComposer(props: ConversationComposerProps) {
  const { run, view } = props;
  const prompts = useMemo(
    () => sentPrompts(run.messages, run.piiMasks, view.pendingSubmission),
    [run.messages, run.piiMasks, view.pendingSubmission],
  );
  const composer = useThreadComposer(
    view.thread,
    Boolean(view.adapters?.deferSend),
  );
  if (composer.unavailable) {
    return <UnavailableModelNotice onNewChat={view.config.events.onNewChat} />;
  }
  return (
    <>
      <ThreadComposerNotices
        thread={view.thread}
        model={composer.model}
        academyGated={composer.academyGated}
        events={view.config.events}
      />
      <AvailableConversationComposer
        {...props}
        features={composer.features}
        prompts={prompts}
      />
    </>
  );
}

function AvailableConversationComposer({
  run,
  view,
  draft,
  composerRef,
  prompts,
  features,
}: ConversationComposerProps & {
  readonly prompts: readonly string[];
  readonly features: ComponentProps<typeof ConfiguredComposer>['features'];
}) {
  const isSubmitting = !run.isStreaming && view.pendingSubmission != null;
  return (
    <ConfiguredComposer
      ref={composerRef}
      config={view.config}
      features={features}
      threadId={view.thread.id}
      draft={draft}
      sentPrompts={prompts}
      clearImagesOnSend={view.composer?.clearOnSend}
      isSubmitting={isSubmitting}
      isStreaming={run.isStreaming}
      isCheckingForRun={run.isCheckingForRun}
      onSend={conversationSend(run, view)}
      onStop={conversationStop(run, view)}
    />
  );
}

function conversationStop(
  run: ReturnType<typeof useConversationRun>,
  view: ConversationComposerProps['view'],
) {
  const { config, adapters, thread, composer, lifecycle } = view;
  const hasCancelTransport = Boolean(config.transport.cancel);
  const canStopRun = run.isRunCancellable && hasCancelTransport;
  const canStop = canStopRun || Boolean(composer?.deferredSendCancellable);
  return canStop
    ? () => {
        if (adapters?.cancelDeferredSend?.(thread.id)) return;
        if (
          canStopRun ||
          (hasCancelTransport && lifecycle.isThreadRunActive(thread.id))
        ) {
          run.stop();
          adapters?.onRunStopped?.(thread.id);
        }
      }
    : undefined;
}

function conversationSend(
  run: ReturnType<typeof useConversationRun>,
  view: ConversationComposerProps['view'],
): ComponentProps<typeof ConfiguredComposer>['onSend'] {
  return (input, accepted) => {
    const clearImmediately = view.composer?.clearOnSend;
    if (clearImmediately) accepted();
    if (view.adapters?.deferSend?.(view.thread.id, input)) return;
    void run.send(input, clearImmediately ? () => undefined : accepted);
  };
}
