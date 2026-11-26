import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import { ConfiguredHistory } from './configured-history';
import {
  createMemoryChatDraftStorage,
  useChatDraft,
  type ChatDraftStorage,
} from '@ayunis/chat/composer';
import { ConfiguredComposer } from './configured-composer';
import { ChatSurface } from './chat-surface';
import type {
  ChatConversationController,
  ChatConversationProps,
} from './chat-conversation-config';
import {
  ChatConversationContent,
  useConversationTimeline,
} from './chat-conversation-content';
import { createChatRunLifecycle, type ChatRunLifecycle } from './run-lifecycle';
import { useConversationRun } from './use-conversation-run';
import { sentPrompts } from '@ayunis/chat/messages';
import type { ChatSlots } from './chat-surface-config';

export function ChatConversation<Context, Outcome>(
  props: ChatConversationProps<Context, Outcome>,
) {
  return <ConversationSession key={props.sessionKey} {...props} />;
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
    <>
      {props.history && (
        <ConfiguredHistory
          {...props.history}
          capabilities={props.config.capabilities}
          onError={props.adapters?.onError}
        />
      )}
      <ConversationView
        {...props}
        lifecycle={props.lifecycle ?? ownedLifecycle}
        drafts={props.adapters?.drafts ?? memoryDrafts}
      />
    </>
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

function ConversationView<Context, Outcome>(
  props: ConversationViewProps<Context, Outcome>,
) {
  const { thread, slots, lifecycle, drafts } = props;
  const run = useConversationRun(lifecycle, props);
  const draft = useChatDraft(thread.id, drafts);
  const timeline = useConversationTimeline(
    props.timeline,
    props.clientTools?.registry,
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
  const adapters = view.adapters ?? {};
  return (
    <ChatConversationContent
      threadId={view.thread.id}
      copyActions={view.compactComposer}
      messages={run.messages}
      masks={run.piiMasks}
      isStreaming={run.isStreaming}
      canDecide={!run.isStreaming && !run.isCheckingForRun}
      decide={run.sendToolCallDecisions}
      onOpenArtifact={onOpenArtifact}
      timeline={timeline}
      messageImage={slots.messageImage}
      messageNudge={slots.messageNudge}
      messageMarkdown={slots.messageMarkdown}
      pendingSubmission={view.pendingSubmission ?? null}
      contextHint={slots.contextHint}
      waiting={slots.waiting}
      loading={slots.loading}
      assistantActions={slots.assistantActions}
      onPiiUnmaskRequest={adapters.onPiiUnmaskRequest}
      onMessageCopied={adapters.onMessageCopied}
    />
  );
}

function ConversationComposer({
  run,
  view,
  draft,
}: Readonly<{
  run: ReturnType<typeof useConversationRun>;
  view: Pick<
    ChatConversationProps,
    'slots' | 'config' | 'adapters' | 'compactComposer' | 'thread'
  >;
  draft: ComponentProps<typeof ConfiguredComposer>['draft'];
}>) {
  const { slots, config, adapters, compactComposer, thread } = view;
  const prompts = useMemo(
    () => sentPrompts(run.messages, run.piiMasks),
    [run.messages, run.piiMasks],
  );
  const controller = conversationController(run);
  if (slots?.composerFallback) {
    return (
      <>
        {typeof slots.composerFallback === 'function'
          ? slots.composerFallback(controller)
          : slots.composerFallback}
      </>
    );
  }
  const onStop =
    run.isRunCancellable && config.transport.cancel ? run.stop : undefined;
  return (
    <>
      {slots?.composerNotice}
      <ConfiguredComposer
        compact={compactComposer}
        threadId={thread.id}
        capabilities={config.capabilities}
        adapters={adapters}
        draft={draft}
        slots={slots}
        sentPrompts={prompts}
        isStreaming={run.isStreaming}
        isCheckingForRun={run.isCheckingForRun}
        onSend={(input, accepted) => {
          void run.send(input, accepted);
        }}
        onStop={onStop}
      />
    </>
  );
}

function conversationController(
  run: ReturnType<typeof useConversationRun>,
): ChatConversationController {
  return {
    messages: run.messages,
    piiMasks: run.piiMasks,
    threadTitle: run.threadTitle,
    isStreaming: run.isStreaming,
    isCheckingForRun: run.isCheckingForRun,
    isRunCancellable: run.isRunCancellable,
    send: (input, accepted = () => undefined) => run.send(input, accepted),
    resumeStartedRun: run.resumeStartedRun,
    stop: run.stop,
  };
}
