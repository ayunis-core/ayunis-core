import { toast } from '@ayunis/ui/lib/toast';
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
} from '@ayunis/chat/surface';
import type { SendMessageInput } from '@ayunis/chat/runs';
import type { useStartPaneThread } from '@/outlook/lib/use-start-pane-thread';
import { useOrgChatSettingsControllerGetChatStartDefaults } from '@ayunis/api-client/endpoints';
import { PaneSourceChips } from '@/outlook/ui/PaneSourceChips';
import { PaneAcademyNotice } from '@/outlook/ui/PaneAcademyNotice';
import { ModelSelector } from '@ayunis/chat/model-presentation';
import { PaneNewChatLayout } from '@/outlook/ui/PaneNewChatLayout';
import { transcribePaneAudio } from '@/outlook/api/chat-api';

export function PaneNewChat({
  draftKey,
  header,
  drafts,
  capabilities,
  startAttempt,
  canReadDefaults,
  isAcademyGated,
  onError,
}: Readonly<{
  draftKey: string;
  header: ReactNode;
  drafts: ChatDraftStorage;
  capabilities: ChatCapabilities;
  startAttempt: ReturnType<typeof useStartPaneThread>;
  canReadDefaults: boolean;
  isAcademyGated: boolean;
  onError: (error: unknown) => void;
}>) {
  const draft = useChatDraft(draftKey, drafts);
  const { start, busy, stop } = startAttempt;
  const [anonymous, setAnonymous] = useState<boolean>();
  const defaults = useOrgChatSettingsControllerGetChatStartDefaults({
    query: { enabled: canReadDefaults },
  });
  const documentAttachments = usePaneDocumentAttachments(capabilities);
  const [selectedModel, setSelected] = useState<string>();
  const [files, setFiles] = useState<File[]>([]);
  const chosenAnonymous =
    anonymous ?? defaults.data?.anonymousModeByDefault ?? false;
  const modelSelection = usePaneComposerModel({
    enabled: Boolean(capabilities.modelSelection),
    anonymous: chosenAnonymous,
    selectedValue: selectedModel,
  });
  const { model, modelId, mode, isAnonymousEnforced } = modelSelection.resolved;
  const isAnonymous = isAnonymousEnforced || chosenAnonymous;
  const waiting =
    busy || (canReadDefaults && defaults.isPending) || modelSelection.pending;
  const sendDisabled =
    waiting || isAcademyGated || (capabilities.modelSelection && !modelId);
  function submit(input: SendMessageInput, accepted: () => void) {
    if (sendDisabled) return;
    void start(
      { ...input, ...(mode ? { mode } : { modelId }), isAnonymous, files },
      accepted,
    );
  }
  return (
    <PaneNewChatLayout
      header={header}
      busy={busy}
      waiting={Boolean(sendDisabled)}
      onStarter={(text) => submit({ text }, () => undefined)}
      composer={
        <>
          {isAcademyGated && <PaneAcademyNotice />}
          <ConfiguredComposer
            compact
            threadId={draftKey}
            capabilities={capabilities}
            draft={draft}
            isStreaming={busy}
            isSubmitting={busy}
            onStop={() => stop()}
            isCheckingForRun={waiting}
            adapters={{
              onError,
              imageAttachments: model?.canVision,
              documentAttachments,
              onAttachmentError: (error) => {
                toast.error(error.message, {
                  position: 'bottom-center',
                  closeButton: true,
                });
              },
              uploadFiles: async (_id, added, signal) => {
                signal.throwIfAborted();
                setFiles((current) => [...current, ...added]);
              },
              transcribe: transcribePaneAudio,
              isSendDisabled: Boolean(sendDisabled),
            }}
            slots={{
              composerModel: capabilities.modelSelection && (
                <ModelSelector
                  models={modelSelection.models}
                  resolutions={modelSelection.resolutions}
                  modelListPresentation="submenu"
                  selectedModelId={modelSelection.value}
                  isAnonymous={isAnonymous}
                  isDisabled={waiting || modelSelection.failed}
                  onModelChange={setSelected}
                  placeholder="Select a model"
                />
              ),
              composerLeading: (
                <AnonymousButton
                  isAnonymous={isAnonymous}
                  isDisabled={waiting}
                  isEnforced={isAnonymousEnforced}
                  onAnonymousChange={setAnonymous}
                />
              ),
              attachments: files.length > 0 && (
                <PaneSourceChips
                  sources={files.map(({ name, type }, index) => ({
                    id: String(index),
                    name,
                    type: 'text',
                    fileType: type.startsWith('audio/') ? 'audio' : undefined,
                  }))}
                  remove={(id) =>
                    setFiles((current) =>
                      current.filter((_, index) => String(index) !== id),
                    )
                  }
                />
              ),
            }}
            onSend={submit}
          />
        </>
      }
    />
  );
}
