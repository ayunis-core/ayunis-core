import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  useModelModeDefaultsControllerGetDefaultSelection,
  useOrgChatSettingsControllerGetChatStartDefaults,
} from '@ayunis/api-client/endpoints';
import type { ModelMode } from '@ayunis/api-client/schemas';
import {
  createMemoryChatDraftStorage,
  useChatDraft,
} from '@ayunis/chat/composer';
import { resolveSelectedModel } from './model-presentation/model-modes';
import type { ChatConfig } from './chat-config';
import { ConfiguredComposer } from './configured-composer';
import type {
  ComposerFeatures,
  ComposerModelControl,
  ConfiguredComposerRef,
} from './configured-composer-types';
import { useComposerEnvironment, useComposerModels } from './composer-data';
import { defaultComposerValue } from './new-chat-model';
import {
  useNewChatSources,
  type NewChatSourceFile,
  type NewChatSourceStatus,
} from './use-new-chat-sources';
import type { SendMessageInput } from './use-chat-run-lifecycle';

export type { NewChatSourceFile, NewChatSourceStatus };

export type NewChatModel = { modelId: string } | { mode: ModelMode };

export interface NewChatSelection {
  readonly model: NewChatModel | null;
  readonly isAnonymous: boolean;
  /** False while the composer could not start a chat, e.g. while gated or loading. */
  readonly canStart: boolean;
}

export interface NewChatStart extends SendMessageInput {
  readonly modelId?: string;
  readonly mode?: ModelMode;
  readonly isAnonymous: boolean;
  readonly sources: readonly NewChatSourceFile[];
  readonly onSourceStatus: (
    sourceId: string,
    status: NewChatSourceStatus,
  ) => void;
}

export interface NewChatComposerHandle {
  readonly setMessage: (message: string) => void;
  readonly sendMessage: (message: string) => void;
  readonly addFiles: (files: File[]) => void;
}

export interface NewChatComposerProps {
  readonly config: Pick<
    ChatConfig,
    | 'layout'
    | 'drafts'
    | 'skills'
    | 'knowledgeBases'
    | 'integrations'
    | 'tourTargets'
  >;
  /** Persists the unsent draft under this key; without it the draft lives only while mounted. */
  readonly draftKey?: string;
  /** A model id or `mode:<mode>` preferred over the user's default, e.g. from a link. */
  readonly initialModel?: string;
  readonly placeholder?: string;
  /** A start is in flight. */
  readonly busy: boolean;
  readonly onStart: (start: NewChatStart, accepted: () => void) => void;
  readonly onStop: () => void;
  readonly onSelectionChange?: (selection: NewChatSelection) => void;
}

function useModelChoice(preferred: string | undefined) {
  const [picked, setPicked] = useState<{
    readonly preferred: string | undefined;
    readonly value: string;
  }>();
  // A changed default (e.g. after an admin changed it) replaces an earlier pick.
  const value =
    picked && picked.preferred === preferred ? picked.value : preferred;
  return {
    value,
    pick: (next: string) => setPicked({ preferred, value: next }),
  };
}

function useAnonymousChoice() {
  const startDefaults = useOrgChatSettingsControllerGetChatStartDefaults();
  const [choice, setChoice] = useState<boolean>();
  return {
    isAnonymous: choice ?? startDefaults.data?.anonymousModeByDefault ?? false,
    pending: startDefaults.isPending,
    choose: setChoice,
  };
}

function useNewChatModel(
  initialModel: string | undefined,
  isAnonymous: boolean,
) {
  const models = useComposerModels();
  const defaults = useModelModeDefaultsControllerGetDefaultSelection();
  const choice = useModelChoice(
    initialModel ?? defaultComposerValue(defaults.data, models.models),
  );
  const resolved = resolveSelectedModel(
    choice.value,
    models.models,
    models.resolutions,
    isAnonymous,
    defaults.data ?? undefined,
  );
  // A pick made before the default arrives would be replaced by it.
  const awaitingDefault = initialModel === undefined && defaults.isPending;
  const control: ComposerModelControl = {
    models: models.models,
    resolutions: models.resolutions,
    value: choice.value,
    placeholder: models.placeholder,
    disabled: models.unavailable || awaitingDefault,
    locked: false,
    onChange: choice.pick,
  };
  return {
    control,
    resolved,
    // A failed models request leaves the default model to start with.
    pending: models.loading || awaitingDefault,
  };
}

function useNewChatComposer(props: NewChatComposerProps) {
  const environment = useComposerEnvironment();
  const anonymous = useAnonymousChoice();
  const { control, resolved, pending } = useNewChatModel(
    props.initialModel,
    anonymous.isAnonymous,
  );
  const sources = useNewChatSources();
  const ready = !pending && !anonymous.pending && !environment.academyGated;
  const canStart = ready && Boolean(resolved.modelId);
  const features: ComposerFeatures = {
    model: control,
    anonymous: {
      isAnonymous: anonymous.isAnonymous,
      isEnforced: resolved.isAnonymousEnforced,
      disabled: anonymous.pending,
      onChange: anonymous.choose,
    },
    sources: sources.items,
    removeSource: sources.remove,
    uploadFiles: environment.documents ? sources.add : undefined,
    imageAttachments: Boolean(resolved.model?.canVision),
    voice: environment.voice,
    sendDisabled: !canStart,
  };
  return {
    features,
    sources,
    modelId: resolved.modelId,
    mode: resolved.mode,
    isAnonymous: resolved.isAnonymousEnforced || anonymous.isAnonymous,
    canStart,
  };
}

function chatModel(
  modelId: string | undefined,
  mode: ModelMode | null,
): NewChatModel | null {
  if (!modelId) return null;
  return mode ? { mode } : { modelId };
}

function useSelectionReport(
  {
    modelId,
    mode,
    isAnonymous,
    canStart,
  }: ReturnType<typeof useNewChatComposer>,
  onSelectionChange: NewChatComposerProps['onSelectionChange'],
) {
  const report = useRef(onSelectionChange);
  useEffect(() => {
    report.current = onSelectionChange;
  });
  useEffect(() => {
    report.current?.({
      model: chatModel(modelId, mode),
      isAnonymous,
      canStart,
    });
  }, [modelId, mode, isAnonymous, canStart]);
}

/** The composer of a chat that doesn't exist yet; the host starts it. */
export const NewChatComposer = forwardRef<
  NewChatComposerHandle,
  NewChatComposerProps
>(function NewChatComposer(props, ref) {
  const [memoryDrafts] = useState(createMemoryChatDraftStorage);
  const draft = useChatDraft(
    props.draftKey,
    props.config.drafts ?? memoryDrafts,
  );
  const chat = useNewChatComposer(props);
  const composerRef = useRef<ConfiguredComposerRef>(null);
  useSelectionReport(chat, props.onSelectionChange);
  useImperativeHandle(ref, () => ({
    setMessage: draft.setMessage,
    sendMessage: (message) => composerRef.current?.sendMessage(message),
    addFiles: chat.sources.add,
  }));
  return (
    <ConfiguredComposer
      ref={composerRef}
      config={props.config}
      features={chat.features}
      threadId={props.draftKey ?? 'new-chat'}
      draft={draft}
      placeholder={props.placeholder}
      isSubmitting={props.busy}
      isStreaming={false}
      isCheckingForRun={false}
      onSend={(input, accepted) =>
        props.onStart(
          {
            ...input,
            ...chatModel(chat.modelId, chat.mode),
            isAnonymous: chat.isAnonymous,
            sources: chat.sources.files,
            onSourceStatus: chat.sources.setStatus,
          },
          accepted,
        )
      }
      onStop={() => {
        props.onStop();
        chat.sources.resetStatus();
      }}
    />
  );
});
