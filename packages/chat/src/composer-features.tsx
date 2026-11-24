import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { useVoiceRecording } from '@ayunis/chat/composer';
import { useChatAction } from './use-chat-action';
import type {
  ChatConversationAdapters,
  ChatModelAdapter,
} from './chat-conversation-config';

type Upload = NonNullable<ChatConversationAdapters['uploadFiles']>;
type Transcribe = NonNullable<ChatConversationAdapters['transcribe']>;
type ChatAction = ReturnType<typeof useChatAction>;

interface AttachmentProps {
  readonly threadId: string;
  readonly disabled: boolean;
  readonly audio?: boolean;
  readonly images?: boolean;
  readonly upload?: Upload;
  readonly onImages: (files: File[]) => void;
  readonly action: ChatAction;
}

export function AttachmentFields({
  threadId,
  disabled,
  audio,
  images,
  upload,
  onImages,
  action,
}: AttachmentProps) {
  const { t } = useTranslation('common');
  const disabledDuringAction = disabled || action.busy;

  function selectFiles(files: File[]) {
    if (files.length && upload)
      void action.run((signal) => upload(threadId, files, signal));
  }

  return (
    <>
      {upload && (
        <FileField
          testId="chat-attach-files"
          label={t('chatSurface.attachFiles', { defaultValue: 'Attach files' })}
          disabled={disabledDuringAction}
          select={selectFiles}
        />
      )}
      {upload && audio && (
        <FileField
          label={t('chatSurface.attachAudio', { defaultValue: 'Attach audio' })}
          accept="audio/*"
          disabled={disabledDuringAction}
          select={selectFiles}
        />
      )}
      {images && (
        <FileField
          label={t('chatSurface.attachImages', {
            defaultValue: 'Attach images',
          })}
          accept="image/*"
          disabled={disabledDuringAction}
          select={(files) =>
            onImages(files.filter((file) => file.type.startsWith('image/')))
          }
        />
      )}
    </>
  );
}

function FileField({
  label,
  testId,
  accept,
  disabled,
  select,
}: Readonly<{
  label: string;
  testId?: string;
  accept?: string;
  disabled: boolean;
  select: (files: File[]) => void;
}>) {
  return (
    <label className="text-sm">
      {label}
      <Input
        type="file"
        data-testid={testId}
        multiple
        accept={accept}
        disabled={disabled}
        onChange={({ currentTarget: input }) => {
          select(Array.from(input.files ?? []));
          input.value = '';
        }}
      />
    </label>
  );
}

export function ModelField({
  threadId,
  disabled,
  adapter,
  action,
}: Readonly<{
  threadId: string;
  disabled: boolean;
  adapter: ChatModelAdapter;
  action: ChatAction;
}>) {
  const { t } = useTranslation('common');
  if (!adapter.available.length) return null;

  return (
    <Select
      value={adapter.selected ?? ''}
      disabled={disabled || action.busy}
      onValueChange={(modelId) => {
        void action.run((signal) => adapter.select(threadId, modelId, signal));
      }}
    >
      <SelectTrigger
        aria-label={t('chatSurface.model', { defaultValue: 'Model' })}
      >
        <SelectValue
          placeholder={t('chatSurface.pickModel', {
            defaultValue: 'Select model',
          })}
        />
      </SelectTrigger>
      <SelectContent>
        {adapter.available.map(({ id, name }) => (
          <SelectItem key={id} value={id}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function VoiceField({
  transcribe,
  onTranscript,
  onError,
}: Readonly<{
  transcribe: Transcribe;
  onTranscript: (text: string) => void;
  onError?: (error: unknown) => void;
}>) {
  const { t } = useTranslation('common');
  const action = useChatAction();
  const voice = useVoiceRecording(
    onTranscript,
    (key) => onError?.(new Error(t(key))),
    async (audio, filename) => {
      let text: string | null = null;
      await action.run(async (signal) => {
        text = await transcribe(audio, filename, signal);
      });
      return text;
    },
  );
  if (!voice.isSupported) return null;

  const label = voice.isRecording
    ? t('chatSurface.stopRecording', { defaultValue: 'Stop recording' })
    : t('chatSurface.dictate', { defaultValue: 'Dictate' });
  return (
    <Button
      type="button"
      variant="outline"
      disabled={voice.isStarting || voice.isTranscribing}
      onClick={() => {
        if (voice.isRecording) voice.stopRecording();
        else void voice.startRecording();
      }}
    >
      {label}
    </Button>
  );
}
