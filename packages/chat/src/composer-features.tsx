import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { Button } from '@ayunis/ui/components/button';
import { Loader2, Mic } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { transcriptionsControllerTranscribe } from '@ayunis/api-client/endpoints';
import { AttachmentMenu } from './composer-toolbar';
import { useComposerAttachmentSelection } from './composer/use-composer-attachment-selection';
import { useVoiceRecording } from '@ayunis/chat/composer';
import { useChatAction } from './use-chat-action';
import { showComposerError } from './composer-errors';

const TRANSCRIPTION_TIMEOUT_MS = 30_000;

export function AttachmentFields({
  disabled,
  closeMenu,
  images,
  upload,
  onImages,
  menuActions,
}: Readonly<{
  disabled: boolean;
  closeMenu: boolean;
  images: boolean;
  upload?: (files: File[]) => void;
  onImages: (files: File[]) => void;
  menuActions?: ReactNode;
}>) {
  const onFiles = upload
    ? (files: File[]) => {
        if (files.length) upload(files);
      }
    : undefined;
  const selectFiles = useComposerAttachmentSelection({
    onImages: images ? onImages : undefined,
    onFiles,
    onError: (error) => showComposerError(error.message),
  });

  return (
    <AttachmentMenu
      disabled={disabled}
      closeMenu={closeMenu}
      onFiles={onFiles || images ? selectFiles : undefined}
      onAudio={onFiles}
      accept={onFiles ? undefined : 'image/*'}
      menuActions={menuActions}
    />
  );
}

async function transcribe(audio: Blob, filename: string, signal: AbortSignal) {
  const { text } = await transcriptionsControllerTranscribe(
    { file: new File([audio], filename, { type: audio.type }) },
    AbortSignal.any([signal, AbortSignal.timeout(TRANSCRIPTION_TIMEOUT_MS)]),
  );
  return text;
}

export function VoiceField({
  onTranscript,
}: Readonly<{ onTranscript: (text: string) => void }>) {
  const { t } = useTranslation('common');
  const action = useChatAction();
  const voice = useVoiceRecording(
    onTranscript,
    (key) => showComposerError(t(key)),
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
  return (
    <ToolbarMicrophone recording={recording} busy={busy} toggle={toggle} />
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
