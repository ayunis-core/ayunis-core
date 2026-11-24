import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatDraft, type ChatDraftStorage } from '@ayunis/chat/composer';
import {
  ConfiguredComposer,
  type ChatCapabilities,
} from '@ayunis/chat/surface';
import type { SendMessageInput } from '@ayunis/chat/runs';
import type { useStartPaneThread } from '@/outlook/lib/use-start-pane-thread';
import {
  useModelsControllerGetPermittedLanguageModels,
  useOrgChatSettingsControllerGetChatStartDefaults,
} from '@ayunis/api-client/endpoints';
import { Button } from '@ayunis/ui/components/button';
import { Checkbox } from '@ayunis/ui/components/checkbox';
import { Label } from '@ayunis/ui/components/label';
import { transcribePaneAudio } from '@/outlook/api/chat-api';

export function PaneNewChat({
  draftKey,
  drafts,
  capabilities,
  startAttempt,
  canReadDefaults,
  onError,
}: Readonly<{
  draftKey: string;
  drafts: ChatDraftStorage;
  capabilities: ChatCapabilities;
  startAttempt: ReturnType<typeof useStartPaneThread>;
  canReadDefaults: boolean;
  onError: (error: unknown) => void;
}>) {
  const { t } = useTranslation('outlook');
  const draft = useChatDraft(draftKey, drafts);
  const { start, busy, stop } = startAttempt;
  const anonymousId = useId();
  const [anonymous, setAnonymous] = useState<boolean>();
  const defaults = useOrgChatSettingsControllerGetChatStartDefaults({
    query: { enabled: canReadDefaults },
  });
  const [selectedModel, setSelected] = useState<string>();
  const [files, setFiles] = useState<File[]>([]);
  const models = useModelsControllerGetPermittedLanguageModels({
    query: { enabled: Boolean(capabilities.modelSelection) },
  });
  const available = models.data?.filter(({ isArchived }) => !isArchived) ?? [];
  const selected =
    available.find(({ id }) => id === selectedModel) ??
    available.find(({ isDefault }) => isDefault) ??
    available[0];
  const isAnonymous = Boolean(
    selected?.anonymousOnly ||
    (anonymous ?? defaults.data?.anonymousModeByDefault),
  );
  const waiting =
    busy ||
    (canReadDefaults && defaults.isPending) ||
    Boolean(capabilities.modelSelection && models.isPending);
  const starterPrompts = [t('chat.prepareReply'), t('chat.summarizeEmail')];
  function submit(input: SendMessageInput, accepted: () => void) {
    void start(
      { ...input, modelId: selected?.id, isAnonymous, files },
      accepted,
    );
  }
  return (
    <main
      data-testid="outlook-new-chat"
      className="flex min-h-0 flex-1 flex-col justify-end gap-4 p-3"
    >
      <h1 className="px-1 text-lg font-medium">
        {t('chat.newChat', { defaultValue: 'New chat' })}
      </h1>
      <div className="flex flex-wrap gap-2">
        {starterPrompts.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            size="sm"
            disabled={waiting}
            onClick={() => submit({ text: prompt }, () => undefined)}
          >
            {prompt}
          </Button>
        ))}
      </div>
      <div data-testid="chat-input">
        <ConfiguredComposer
          threadId={draftKey}
          capabilities={capabilities}
          draft={draft}
          isStreaming={busy}
          onStop={() => stop()}
          isCheckingForRun={waiting}
          adapters={{
            onError,
            imageAttachments: selected?.canVision,
            uploadFiles: async (_id, added, signal) => {
              signal.throwIfAborted();
              setFiles((current) => [...current, ...added]);
            },
            transcribe: transcribePaneAudio,
            model: {
              available: available.map(({ id, displayName }) => ({
                id,
                name: displayName,
              })),
              selected: selected?.id,
              select: async (_id, id) => {
                setSelected(id);
              },
            },
          }}
          slots={{
            attachments: files.length > 0 && (
              <PendingFiles files={files} remove={setFiles} />
            ),
          }}
          onSend={submit}
        />
      </div>
      <div className="flex items-center gap-2 px-1">
        <Checkbox
          id={anonymousId}
          checked={isAnonymous}
          disabled={waiting || selected?.anonymousOnly}
          onCheckedChange={(checked) => setAnonymous(checked === true)}
        />
        <Label htmlFor={anonymousId}>{t('chat.anonymous')}</Label>
      </div>
    </main>
  );
}

function PendingFiles({
  files,
  remove,
}: Readonly<{ files: File[]; remove: (files: File[]) => void }>) {
  return (
    <ul className="flex flex-wrap gap-2 text-sm">
      {files.map((file, index) => (
        <li key={file.name + index}>
          <Button
            variant="secondary"
            size="xs"
            type="button"
            onClick={() =>
              remove(files.filter((_, position) => position !== index))
            }
          >
            {file.name} ×
          </Button>
        </li>
      ))}
    </ul>
  );
}
