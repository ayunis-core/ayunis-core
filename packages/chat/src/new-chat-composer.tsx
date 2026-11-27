import type { ChatConfig, ChatStartOrigin } from './chat-config';
import type { ChatStartRequest } from './chat-start';
import { useComposerEnvironment } from './composer-data';
import { AcademyGateNotice } from './model-presentation/AcademyGateNotice';
import type { ChatRunLifecycle } from './run-lifecycle';
import { StartComposer, type NewChatStart } from './start-composer';
import { useChatStart } from './use-chat-start';

export interface NewChatContext {
  readonly workspaceId?: string;
  readonly origin?: ChatStartOrigin;
}

/** The chat a composer's send starts, with what the surface attached. */
export function chatStartRequest(
  start: NewChatStart,
  config: Pick<ChatConfig, 'knowledgeBases' | 'integrations'>,
  context: NewChatContext,
): ChatStartRequest {
  return {
    text: start.text,
    images: start.images ?? [],
    modelId: start.mode ? undefined : start.modelId,
    mode: start.mode,
    isAnonymous: start.isAnonymous,
    workspaceId: context.workspaceId,
    origin: context.origin,
    skillId: start.skillId,
    voiceInput: start.voiceInput,
    sources: start.sources,
    onSourceStatus: start.onSourceStatus,
    knowledgeBases: config.knowledgeBases?.attached ?? [],
    integrations: config.integrations?.attached ?? [],
  };
}

export interface NewChatComposerProps {
  readonly config: Pick<
    ChatConfig,
    | 'layout'
    | 'drafts'
    | 'knowledgeBases'
    | 'integrations'
    | 'tourTargets'
    | 'events'
  >;
  /** Shares runs with the `Conversation` that opens the started chat. */
  readonly lifecycle: ChatRunLifecycle;
  /** Files the chat under this workspace. */
  readonly workspaceId?: string;
  /** Why the chat exists, e.g. a notification; a plain chat without it. */
  readonly origin?: ChatStartOrigin;
  /** A model id or `mode:<mode>` preferred over the user's default. */
  readonly initialModel?: string;
  readonly placeholder?: string;
}

/**
 * A composer embedded in another page that starts a chat with what it was
 * given and reports it through `events.onThreadStarted`, without settling.
 */
export function NewChatComposer(props: NewChatComposerProps) {
  const { config } = props;
  const environment = useComposerEnvironment();
  const chat = useChatStart({
    lifecycle: props.lifecycle,
    events: config.events,
    settleMs: 0,
  });
  const { onNavigate } = config.events;
  return (
    <div>
      {environment.academyGated && (
        <AcademyGateNotice
          className="mb-2"
          onOpenAcademy={
            onNavigate ? () => onNavigate({ kind: 'academy' }) : undefined
          }
        />
      )}
      <StartComposer
        config={config}
        initialModel={props.initialModel}
        placeholder={props.placeholder}
        busy={chat.busy}
        onStart={(start, accepted) =>
          void chat.start(
            chatStartRequest(start, config, {
              workspaceId: props.workspaceId,
              origin: props.origin,
            }),
            accepted,
          )
        }
        onStop={chat.stop}
      />
    </div>
  );
}
