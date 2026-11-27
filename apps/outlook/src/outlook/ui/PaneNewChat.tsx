import { useState, type ReactNode } from 'react';
import { usePaneComposerModel } from '@/outlook/lib/use-pane-composer-model';
import { usePaneDocumentAttachments } from '@/outlook/lib/use-pane-chat-data';
import {
  AnonymousButton,
  useChatDraft,
  type ChatDraftStorage,
} from '@ayunis/chat/composer';
import {
  ConfiguredComposer,
  type ChatCapabilities,
  type ChatConversationAdapters,
  type ChatConversationSlots,
} from '@ayunis/chat/surface';
import type { SendMessageInput } from '@ayunis/chat/runs';
import type { useStartPaneThread } from '@/outlook/lib/use-start-pane-thread';
import { useOrgChatSettingsControllerGetChatStartDefaults } from '@ayunis/api-client/endpoints';
import { ChatAttachments } from '@ayunis/chat/attachments';
import { PaneAcademyNotice } from '@/outlook/ui/PaneAcademyNotice';
import { ModelSelector } from '@ayunis/chat/model-presentation';
import { PaneNewChatLayout } from '@/outlook/ui/PaneNewChatLayout';
import { transcribePaneAudio } from '@/outlook/api/chat-api';
import { showAttachmentError } from '@/outlook/lib/show-attachment-error';

type PaneNewChatProps = Readonly<{
  draftKey: string;
  header: ReactNode;
  drafts: ChatDraftStorage;
  capabilities: ChatCapabilities;
  startAttempt: ReturnType<typeof useStartPaneThread>;
  canReadDefaults: boolean;
  isAcademyGated: boolean;
  onError: (error: unknown) => void;
}>;

function useAnonymousChoice(canReadDefaults: boolean) {
  const [anonymous, setAnonymous] = useState<boolean>();
  const defaults = useOrgChatSettingsControllerGetChatStartDefaults({
    query: { enabled: canReadDefaults },
  });
  return {
    chosen: anonymous ?? defaults.data?.anonymousModeByDefault ?? false,
    setAnonymous,
    pending: canReadDefaults && defaults.isPending,
  };
}

function useNewChatModel({
  capabilities,
  canReadDefaults,
  isAcademyGated,
  startAttempt,
}: PaneNewChatProps) {
  const [selectedModel, setSelected] = useState<string>();
  const anonymous = useAnonymousChoice(canReadDefaults);
  const selection = usePaneComposerModel({
    enabled: Boolean(capabilities.modelSelection),
    anonymous: anonymous.chosen,
    selectedValue: selectedModel,
  });
  const { modelId, isAnonymousEnforced } = selection.resolved;
  const waiting = startAttempt.busy || anonymous.pending || selection.pending;
  const sendDisabled =
    waiting || isAcademyGated || (capabilities.modelSelection && !modelId);
  return {
    selection,
    setSelected,
    setAnonymous: anonymous.setAnonymous,
    isAnonymous: isAnonymousEnforced || anonymous.chosen,
    waiting,
    sendDisabled: Boolean(sendDisabled),
  };
}

type NewChatModel = ReturnType<typeof useNewChatModel>;

function useFileQueue() {
  const [files, setFiles] = useState<File[]>([]);
  const uploadFiles: ChatConversationAdapters['uploadFiles'] = (
    _id,
    added,
    signal,
  ) => {
    if (signal.aborted) return Promise.reject(signal.reason as Error);
    setFiles((current) => [...current, ...added]);
    return Promise.resolve();
  };
  const remove = (id: string) =>
    setFiles((current) => current.filter((_, index) => String(index) !== id));
  return { files, uploadFiles, remove };
}

function newChatSlots(
  capabilities: ChatCapabilities,
  chat: NewChatModel,
  queue: ReturnType<typeof useFileQueue>,
): ChatConversationSlots {
  const { selection, isAnonymous, waiting } = chat;
  return {
    composerModel: capabilities.modelSelection && (
      <ModelSelector
        models={selection.models}
        resolutions={selection.resolutions}
        modelListPresentation="submenu"
        selectedModelId={selection.value}
        isAnonymous={isAnonymous}
        isDisabled={waiting || selection.failed}
        onModelChange={chat.setSelected}
        placeholder="Select a model"
      />
    ),
    composerLeading: (
      <AnonymousButton
        isAnonymous={isAnonymous}
        isDisabled={waiting}
        isEnforced={selection.resolved.isAnonymousEnforced}
        onAnonymousChange={chat.setAnonymous}
      />
    ),
    attachments: queue.files.length > 0 && (
      <ChatAttachments
        sources={queue.files.map(({ name, type }, index) => ({
          id: String(index),
          name,
          type: 'text',
          fileType: type.startsWith('audio/') ? 'audio' : undefined,
        }))}
        onRemoveSource={queue.remove}
      />
    ),
  };
}

function useNewChatStart(props: PaneNewChatProps) {
  const queue = useFileQueue();
  const chat = useNewChatModel(props);
  const { modelId, mode } = chat.selection.resolved;
  function submit(input: SendMessageInput, accepted: () => void) {
    if (chat.sendDisabled) return;
    const target = mode ? { mode } : { modelId };
    void props.startAttempt.start(
      {
        ...input,
        ...target,
        isAnonymous: chat.isAnonymous,
        files: queue.files,
      },
      accepted,
    );
  }
  return { queue, chat, submit };
}

export function PaneNewChat(props: PaneNewChatProps) {
  const { draftKey, drafts, capabilities, startAttempt, onError } = props;
  const draft = useChatDraft(draftKey, drafts);
  const { busy, stop } = startAttempt;
  const documentAttachments = usePaneDocumentAttachments(capabilities);
  const { queue, chat, submit } = useNewChatStart(props);
  const { model } = chat.selection.resolved;
  return (
    <PaneNewChatLayout
      header={props.header}
      busy={busy}
      waiting={chat.sendDisabled}
      onStarter={(text) => submit({ text }, () => undefined)}
      composer={
        <>
          {props.isAcademyGated && <PaneAcademyNotice />}
          <ConfiguredComposer
            compact
            threadId={draftKey}
            capabilities={capabilities}
            draft={draft}
            isStreaming={busy}
            isSubmitting={busy}
            onStop={() => stop()}
            isCheckingForRun={chat.waiting}
            adapters={{
              onError,
              imageAttachments: model?.canVision,
              documentAttachments,
              onAttachmentError: showAttachmentError,
              uploadFiles: queue.uploadFiles,
              transcribe: transcribePaneAudio,
              isSendDisabled: chat.sendDisabled,
            }}
            slots={newChatSlots(capabilities, chat, queue)}
            onSend={submit}
          />
        </>
      }
    />
  );
}
