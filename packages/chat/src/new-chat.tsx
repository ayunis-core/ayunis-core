import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { ChatSkills, ChatViewConfig } from './chat-config';
import type { ChatStartRequest } from './chat-start';
import { useComposerEnvironment } from './composer-data';
import { AcademyGateNotice } from './model-presentation/AcademyGateNotice';
import { OnboardingHint } from './new-chat/OnboardingHint';
import { PinnedSkills } from './new-chat/PinnedSkills';
import { NewChatLayout, type NewChatPhase } from './new-chat/new-chat-layout';
import { chatStartRequest } from './new-chat-composer';
import { onboardingChat, type OnboardingChat } from './new-chat-onboarding';
import { UnreadUpdatesPanel } from './new-chat-updates';
import type { ChatRunLifecycle } from './run-lifecycle';
import {
  StartComposer,
  type NewChatSelection,
  type StartComposerHandle,
} from './start-composer';
import { TourTarget } from './tour-target';
import { useChatStart } from './use-chat-start';
import { WorkspacePicker } from './workspaces/WorkspacePicker';

/** What the new chat says before the user writes. */
export interface NewChatContent {
  readonly greeting: { readonly title: string; readonly subtitle?: string };
  /** Each sends its prompt as the first message. */
  readonly starterPrompts: readonly {
    readonly label: string;
    readonly prompt: string;
  }[];
}

/** What the new chat opens with, e.g. from the link that opened it. */
export interface NewChatPrefill {
  /** A model id or `mode:<mode>` preferred over the user's default. */
  readonly model?: string;
  readonly message?: string;
  readonly files?: readonly File[];
}

export interface NewChatProps {
  /** The new chat runs no client tools; a config that has them is fine. */
  readonly config: ChatViewConfig;
  readonly content: NewChatContent;
  /** Shares runs with the `Conversation` that opens the started chat. */
  readonly lifecycle: ChatRunLifecycle;
  /** Keeps the unsent message, and a start in progress, under this key. */
  readonly draftKey?: string;
  readonly prefill?: NewChatPrefill;
}

/** --new-chat-settle-duration plus --new-chat-disclaimer-fade-duration, plus a frame. */
const NEW_CHAT_SETTLE_MS = 1450 + 900 + 80;

const NO_SELECTION: NewChatSelection = {
  model: null,
  isAnonymous: false,
  canStart: false,
};

/**
 * A chat that doesn't exist yet: greeting, starters and composer, plus the
 * features whose data the surface passes. Sending starts the chat and reports
 * it through `events.onThreadStarted`.
 */
export function NewChat(props: NewChatProps) {
  return <NewChatSession key={props.config.sessionKey} {...props} />;
}

function useBackdropPhase() {
  const [phase, setPhase] = useState<NewChatPhase>('idle');
  const hide = useCallback(() => setPhase('hidden'), []);
  // Once a start began, the backdrop does not come back.
  const exit = () =>
    setPhase((current) => (current === 'idle' ? 'exiting' : current));
  return { phase, exit, hide };
}

function usePrefill(
  composer: RefObject<StartComposerHandle | null>,
  prefill: NewChatPrefill | undefined,
) {
  const message = prefill?.message;
  const files = prefill?.files;
  useEffect(() => {
    if (message) composer.current?.setMessage(message);
  }, [composer, message]);
  useEffect(() => {
    if (files?.length) composer.current?.addFiles([...files]);
  }, [composer, files]);
}

/** A pick can't change while the chat starts with it. */
function lockedSkills(
  skills: ChatSkills | undefined,
  busy: boolean,
): ChatSkills | undefined {
  if (!skills) return undefined;
  return {
    ...skills,
    clear: () => {
      if (!busy) skills.clear();
    },
  };
}

function useNewChat(props: NewChatProps) {
  const { config } = props;
  const { t } = useTranslation('chat');
  const [selection, setSelection] = useState(NO_SELECTION);
  const backdrop = useBackdropPhase();
  const chat = useChatStart({
    lifecycle: props.lifecycle,
    events: config.events,
    draftKey: props.draftKey,
    settleMs: NEW_CHAT_SETTLE_MS,
  });
  function start(request: ChatStartRequest, accepted?: () => void) {
    backdrop.exit();
    void chat.start(request, accepted);
  }
  function startOnboarding({ stage, model, isAnonymous }: OnboardingChat) {
    start({
      text: t(`newChat.onboardingHint.${stage}.message`),
      images: [],
      ...model,
      isAnonymous,
      origin: { kind: 'onboarding', stage },
      sources: [],
      knowledgeBases: [],
      integrations: [],
    });
  }
  const hint = config.onboarding?.hint;
  return {
    chat,
    backdrop,
    selection,
    setSelection,
    start,
    onboarding: hint ? onboardingChat(hint, selection) : null,
    startOnboarding,
  };
}

type NewChatState = ReturnType<typeof useNewChat>;

function NewChatLeading({
  config,
  state,
}: Readonly<{ config: ChatViewConfig; state: NewChatState }>) {
  const environment = useComposerEnvironment();
  const { workspaces, events, tourTargets } = config;
  const { onNavigate } = events;
  const { busy } = state.chat;
  const { onboarding } = state;
  return (
    <>
      {workspaces && !busy && (
        <div className="mb-1.5 flex justify-start">
          <WorkspacePicker
            workspaces={workspaces.items}
            selectedId={workspaces.selected}
            onSelect={workspaces.select}
            onCreate={() => workspaces.create()}
            tourTarget={tourTargets?.workspace}
          />
        </div>
      )}
      {environment.academyGated && (
        <AcademyGateNotice
          className="mb-2"
          onOpenAcademy={
            onNavigate ? () => onNavigate({ kind: 'academy' }) : undefined
          }
        />
      )}
      {onboarding && !busy && (
        <OnboardingHint
          className="mb-2"
          stage={onboarding.stage}
          disabled={environment.academyGated}
          onStart={() => state.startOnboarding(onboarding)}
        />
      )}
    </>
  );
}

function NewChatPinnedSkills({
  config,
  busy,
}: Readonly<{ config: ChatViewConfig; busy: boolean }>) {
  const pinned = config.skills?.pinned;
  if (!pinned) return null;
  return (
    <TourTarget name={config.tourTargets?.pinnedSkills} settles>
      <PinnedSkills
        skills={pinned.items}
        status={pinned.status}
        helpUrl={pinned.helpUrl}
        selectedId={config.skills?.selected?.id}
        disabled={busy}
        onSelect={pinned.select}
      />
    </TourTarget>
  );
}

function NewChatComposerArea({
  props,
  state,
  composer,
}: Readonly<{
  props: NewChatProps;
  state: NewChatState;
  composer: RefObject<StartComposerHandle | null>;
}>) {
  const { config } = props;
  const { chat } = state;
  return (
    <StartComposer
      ref={composer}
      config={{ ...config, skills: lockedSkills(config.skills, chat.busy) }}
      draftKey={props.draftKey}
      initialModel={props.prefill?.model}
      busy={chat.busy}
      onStart={(start, accepted) =>
        state.start(
          chatStartRequest(start, config, {
            workspaceId: config.workspaces?.selected ?? undefined,
          }),
          accepted,
        )
      }
      onStop={chat.stop}
      onSelectionChange={state.setSelection}
    />
  );
}

function NewChatSession(props: NewChatProps) {
  const { config, content } = props;
  const { t } = useTranslation('chat');
  const composer = useRef<StartComposerHandle>(null);
  const state = useNewChat(props);
  const { chat, backdrop } = state;
  usePrefill(composer, props.prefill);
  return (
    <NewChatLayout
      layout={config.layout}
      title={content.greeting.title}
      subtitle={content.greeting.subtitle}
      starters={content.starterPrompts.map(({ label, prompt }) => ({
        label,
        disabled: chat.busy || !state.selection.canStart,
        onSelect: () => composer.current?.sendMessage(prompt),
      }))}
      leading={<NewChatLeading config={config} state={state} />}
      composer={
        <NewChatComposerArea props={props} state={state} composer={composer} />
      }
      supporting={
        config.productUpdates && (
          <UnreadUpdatesPanel
            updates={config.productUpdates}
            links={config.events}
            isCollapsed={chat.busy}
          />
        )
      }
      extras={<NewChatPinnedSkills config={config} busy={chat.busy} />}
      privacyHint={t('newChat.privacyHint')}
      disclaimer={t('chat.inputDisclaimer')}
      isSettling={chat.busy}
      backdropPhase={backdrop.phase}
      onBackdropExitComplete={backdrop.hide}
    />
  );
}
