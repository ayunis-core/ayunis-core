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
import type { ChatConversationProps } from './chat-conversation-config';
import type { ConfiguredComposerRef } from './configured-composer-types';
import { UnavailableModelNotice } from './model-presentation/UnavailableModelNotice';
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
    <ConversationView
      {...props}
      lifecycle={props.lifecycle ?? ownedLifecycle}
      drafts={props.adapters?.drafts ?? memoryDrafts}
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

function ConversationView<Context, Outcome>(
  props: ConversationViewProps<Context, Outcome>,
) {
  const { thread, slots, lifecycle, drafts } = props;
  const run = useConversationRun(lifecycle, props);
  const draft = useChatDraft(thread.id, drafts);
  const composerRef = useRef<ConfiguredComposerRef>(null);
  useImperativeHandle(props.conversationRef, () => ({
    restoreFailedSubmission: (text, files) =>
      composerRef.current?.restoreFailedSubmission(text, files),
    resumeStartedRun: run.resumeStartedRun,
  }));
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

type ConversationComposerProps = Readonly<{
  run: ReturnType<typeof useConversationRun>;
  view: Pick<
    ChatConversationProps,
    | 'slots'
    | 'config'
    | 'adapters'
    | 'compactComposer'
    | 'thread'
    | 'composer'
    | 'pendingSubmission'
  > & { readonly lifecycle: ChatRunLifecycle };
  draft: ComponentProps<typeof ConfiguredComposer>['draft'];
  composerRef: RefObject<ConfiguredComposerRef | null>;
}>;

function ConversationComposer(props: ConversationComposerProps) {
  const { run, view } = props;
  const prompts = useMemo(
    () => sentPrompts(run.messages, run.piiMasks, view.pendingSubmission),
    [run.messages, run.piiMasks, view.pendingSubmission],
  );
  if (view.composer?.unavailableModel) {
    return <UnavailableModelNotice {...view.composer.unavailableModel} />;
  }
  return <AvailableConversationComposer {...props} prompts={prompts} />;
}

function AvailableConversationComposer({
  run,
  view,
  draft,
  composerRef,
  prompts,
}: ConversationComposerProps & { readonly prompts: readonly string[] }) {
  const { slots, config, adapters, compactComposer, thread, composer } = view;
  const onStop = conversationStop(run, view);
  const onSend = conversationSend(run, view);
  const isSubmitting = !run.isStreaming && view.pendingSubmission != null;
  return (
    <>
      {slots?.composerNotice}
      <ConfiguredComposer
        ref={composerRef}
        compact={compactComposer}
        threadId={thread.id}
        capabilities={config.capabilities}
        adapters={adapters}
        draft={draft}
        slots={slots}
        sentPrompts={prompts}
        fileInputTestId={composer?.fileInputTestId}
        stopTestId={composer?.stopTestId}
        clearImagesOnSend={composer?.clearOnSend}
        isSubmitting={isSubmitting}
        isStreaming={run.isStreaming}
        isCheckingForRun={run.isCheckingForRun}
        onSend={onSend}
        onStop={onStop}
      />
    </>
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
