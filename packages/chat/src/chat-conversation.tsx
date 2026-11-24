import { useLayoutEffect, useRef, useState } from 'react';
import { ConfiguredHistory } from './configured-history';
import { useChatDraft, type ChatDraftStorage } from '@ayunis/chat/composer';
import { ConfiguredComposer } from './configured-composer';
import { ChatSurface } from './chat-surface';
import type { ChatConversationProps } from './chat-conversation-config';
import {
  ChatConversationContent,
  useConversationTimeline,
} from './chat-conversation-content';
import { createChatRunLifecycle, type ChatRunLifecycle } from './run-lifecycle';
import { useConversationRun } from './use-conversation-run';

export function ChatConversation<Context, Outcome>(
  props: ChatConversationProps<Context, Outcome>,
) {
  return <ConversationSession key={props.sessionKey} {...props} />;
}

function createMemoryDrafts(): ChatDraftStorage {
  const messages = new Map<string, string>();
  return {
    read: (id) => messages.get(id) ?? '',
    write(id, message) {
      if (message) messages.set(id, message);
      else messages.delete(id);
    },
  };
}

function ConversationSession<Context, Outcome>(
  props: ChatConversationProps<Context, Outcome>,
) {
  const [lifecycle] = useState(() =>
    createChatRunLifecycle(props.config.transport),
  );
  const [memoryDrafts] = useState(createMemoryDrafts);
  useSessionCleanup(lifecycle);
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
        lifecycle={lifecycle}
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

function ConversationView<Context, Outcome>(
  props: ChatConversationProps<Context, Outcome> & {
    lifecycle: ChatRunLifecycle;
    drafts: ChatDraftStorage;
  },
) {
  const { config, thread, slots, adapters, lifecycle, drafts } = props;
  const run = useConversationRun(lifecycle, props);
  const draft = useChatDraft(thread.id, drafts);
  const timeline = useConversationTimeline(
    props.timeline,
    props.clientTools?.registry,
  );
  const onStop =
    run.isRunCancellable && config.transport.cancel ? run.abort : undefined;
  return (
    <ChatSurface
      resetKey={thread.id}
      slots={slots}
      empty={!run.messages.length && !run.isStreaming}
      renderContent={(onOpenArtifact) => (
        <ChatConversationContent
          threadId={thread.id}
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
        <ConfiguredComposer
          key={thread.id}
          threadId={thread.id}
          capabilities={config.capabilities}
          adapters={adapters}
          draft={draft}
          slots={slots}
          isStreaming={run.isStreaming}
          isCheckingForRun={run.isCheckingForRun}
          onSend={run.send}
          onStop={onStop}
        />
      }
    />
  );
}
