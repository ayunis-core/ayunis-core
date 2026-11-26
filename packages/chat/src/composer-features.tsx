import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Loader2, Mic } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { AttachmentMenu } from './composer-toolbar';
import { useComposerAttachmentSelection } from './composer/use-composer-attachment-selection';
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
  readonly compact?: boolean;
  readonly audio?: boolean;
  readonly images?: boolean;
  readonly upload?: Upload;
  readonly onImages: (files: File[]) => void;
  readonly onError?: (error: Error) => void;
  readonly action: ChatAction;
}

type AttachmentSelection = Readonly<{
  disabled: boolean;
  audio?: boolean;
  images?: boolean;
  onFiles?: (files: File[]) => void;
  onImages: (files: File[]) => void;
  onError?: (error: Error) => void;
}>;

export function AttachmentFields(props: AttachmentProps) {
  const {
    threadId,
    disabled,
    compact,
    audio,
    images,
    upload,
    onImages,
    onError,
    action,
  } = props;
  const selection: AttachmentSelection = {
    disabled: disabled || action.busy,
    audio,
    images,
    onImages,
    onError,
    onFiles: upload
      ? (files) => {
          if (files.length)
            void action.run((signal) => upload(threadId, files, signal));
        }
      : undefined,
  };
  return compact ? (
    <CompactAttachmentFields {...selection} />
  ) : (
    <LabeledAttachmentFields {...selection} />
  );
}

function CompactAttachmentFields({
  disabled,
  audio,
  images,
  onFiles,
  onImages,
  onError,
}: AttachmentSelection) {
  const selectFiles = useComposerAttachmentSelection({
    onImages: images ? onImages : undefined,
    onFiles,
    onError,
  });

  return (
    <AttachmentMenu
      disabled={disabled}
      onFiles={onFiles || images ? selectFiles : undefined}
      onAudio={audio ? onFiles : undefined}
      accept={onFiles ? undefined : 'image/*'}
    />
  );
}

function isImage(file: File) {
  return file.type.startsWith('image/');
}

function LabeledAttachmentFields({
  disabled,
  audio,
  images,
  onFiles,
  onImages,
}: AttachmentSelection) {
  const { t } = useTranslation('common');
  return (
    <>
      {onFiles && (
        <FileField
          testId="chat-attach-files"
          label={t('chatSurface.attachFiles', { defaultValue: 'Attach files' })}
          disabled={disabled}
          select={onFiles}
        />
      )}
      {onFiles && audio && (
        <FileField
          label={t('chatSurface.attachAudio', { defaultValue: 'Attach audio' })}
          accept="audio/*"
          disabled={disabled}
          select={onFiles}
        />
      )}
      {images && (
        <FileField
          label={t('chatSurface.attachImages', {
            defaultValue: 'Attach images',
          })}
          accept="image/*"
          disabled={disabled}
          select={(files) => onImages(files.filter(isImage))}
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
  compact,
  onTranscript,
  onError,
}: Readonly<{
  transcribe: Transcribe;
  compact?: boolean;
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
  const { isRecording: recording, isStarting, isTranscribing } = voice;
  const busy = isStarting || isTranscribing;
  function toggle() {
    if (recording) voice.stopRecording();
    else void voice.startRecording();
  }

  if (compact)
    return (
      <ToolbarMicrophone recording={recording} busy={busy} toggle={toggle} />
    );
  const label = recording
    ? t('chatSurface.stopRecording', { defaultValue: 'Stop recording' })
    : t('chatSurface.dictate', { defaultValue: 'Dictate' });
  return (
    <Button type="button" variant="outline" disabled={busy} onClick={toggle}>
      {label}
    </Button>
  );
}

function ToolbarMicrophone({
  recording,
  busy,
  toggle,
}: Readonly<{
  recording: boolean;
  busy: boolean;
  toggle: () => void;
}>) {
  const { t } = useTranslation('common');
  const idleLabel = recording
    ? 'chatInput.microphoneRecording'
    : 'chatInput.microphoneTooltip';
  const label = t(busy ? 'chatInput.transcribing' : idleLabel);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Button
            type="button"
            variant={recording ? 'destructive' : 'outline'}
            size="icon"
            className={cn('rounded-full', recording && 'animate-pulse')}
            aria-label={label}
            data-testid="chat-input-microphone"
            onClick={toggle}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
