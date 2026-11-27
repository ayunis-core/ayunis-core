import { useMemo, type ComponentProps, type RefObject } from 'react';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import { sentPrompts } from '@ayunis/chat/messages';
import type { ChatViewConfig } from './chat-config';
import { ConfiguredComposer } from './configured-composer';
import type { ConfiguredComposerRef } from './configured-composer-types';
import { UnavailableModelNotice } from './model-presentation/UnavailableModelNotice';
import type { ChatRunLifecycle } from './run-lifecycle';
import { ThreadComposerNotices, useThreadComposer } from './thread-composer';
import type { useConversationRun } from './use-conversation-run';

type ConversationRun = ReturnType<typeof useConversationRun>;

interface ConversationComposerProps {
  readonly run: ConversationRun;
  readonly config: ChatViewConfig;
  readonly lifecycle: ChatRunLifecycle;
  readonly thread: GetThreadResponseDto;
  readonly draft: ComponentProps<typeof ConfiguredComposer>['draft'];
  readonly composerRef: RefObject<ConfiguredComposerRef | null>;
  readonly pendingSubmission: string | null;
  readonly isDeferred: boolean;
  readonly hasProcessingSources: boolean;
}

export function ConversationComposer(props: ConversationComposerProps) {
  const { run, config, thread, pendingSubmission } = props;
  const prompts = useMemo(
    () => sentPrompts(run.messages, run.piiMasks, pendingSubmission),
    [run.messages, run.piiMasks, pendingSubmission],
  );
  const composer = useThreadComposer(thread);
  if (composer.unavailable) {
    return <UnavailableModelNotice onNewChat={config.events.onNewChat} />;
  }
  return (
    <>
      <ThreadComposerNotices
        thread={thread}
        model={composer.model}
        academyGated={composer.academyGated}
        events={config.events}
      />
      <ConfiguredComposer
        ref={props.composerRef}
        config={config}
        features={composer.features}
        threadId={thread.id}
        draft={props.draft}
        sentPrompts={prompts}
        isSubmitting={!run.isStreaming && pendingSubmission != null}
        isStreaming={run.isStreaming}
        isCheckingForRun={run.isCheckingForRun}
        onSend={conversationSend(props)}
        onStop={conversationStop(props)}
      />
    </>
  );
}

/**
 * The composer empties as soon as a message is sent; a message that fails
 * comes back into it. While files are processing the message waits for them.
 */
function conversationSend({
  run,
  lifecycle,
  thread,
  hasProcessingSources,
}: ConversationComposerProps): ComponentProps<
  typeof ConfiguredComposer
>['onSend'] {
  return (input, accepted) => {
    accepted();
    lifecycle.startSubmission(thread.id, {
      text: input.text,
      images: input.images?.map(({ file }) => file),
    });
    if (hasProcessingSources) {
      lifecycle.deferThreadRun({
        threadId: thread.id,
        text: input.text,
        images: input.images ?? [],
        skillId: input.skillId,
        voiceInput: input.voiceInput,
        messageCountBeforeSend: thread.messages.length,
      });
      return;
    }
    void run.send(input, () => undefined);
  };
}

/** Stops a running answer, or takes back a message still waiting for its files. */
function conversationStop({
  run,
  config,
  lifecycle,
  thread,
  isDeferred,
}: ConversationComposerProps) {
  const hasCancelTransport = Boolean(config.transport.cancel);
  const canStopRun = run.isRunCancellable && hasCancelTransport;
  if (!canStopRun && !isDeferred) return undefined;
  return () => {
    if (lifecycle.cancelDeferredThreadRun(thread.id)) {
      lifecycle.completeSubmission(thread.id, true);
      return;
    }
    if (
      canStopRun ||
      (hasCancelTransport && lifecycle.isThreadRunActive(thread.id))
    ) {
      run.stop();
      lifecycle.resetSubmission(thread.id);
    }
  };
}
