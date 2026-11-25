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
import type { ChatConversationProps } from './chat-conversation-config';
import {
  ChatConversationContent,
  useConversationTimeline,
} from './chat-conversation-content';
import { createChatRunLifecycle, type ChatRunLifecycle } from './run-lifecycle';
import { useConversationRun } from './use-conversation-run';
import { sentPrompts } from '@ayunis/chat/messages';

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
        <ChatConversationContent
          threadId={thread.id}
          copyActions={props.compactComposer}
          messages={run.messages}
          masks={run.piiMasks}
          isStreaming={run.isStreaming}
          canDecide={!run.isStreaming && !run.isCheckingForRun}
          decide={run.sendToolCallDecisions}
          onOpenArtifact={onOpenArtifact}
          timeline={timeline}
          messageImage={slots?.messageImage}
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
  if (slots?.composerFallback) return <>{slots.composerFallback}</>;
  const onStop =
    run.isRunCancellable && config.transport.cancel ? run.abort : undefined;
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
        onSend={run.send}
        onStop={onStop}
      />
    </>
  );
}
