import { useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FileAudio, Loader2, Upload } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import { PendingUploadItems } from '@/shared/ui/pending-upload-items';
import type { useUploadRecordingAudio } from '@/features/recording-audio';
import { ACCEPTED_AUDIO_PICKER_TYPES } from '@ayunis/chat/upload-policy';

export type RecordingAudioUpload = ReturnType<typeof useUploadRecordingAudio>;

export function RecordingAudioEmpty({
  canManage,
  audioUpload,
}: Readonly<{ canManage: boolean; audioUpload: RecordingAudioUpload }>) {
  const { t } = useTranslation('recordings');
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadAudio, uploads, isUploading } = audioUpload;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) uploadAudio(file);
  };

  return (
    <Empty data-testid="recording-audio-empty">
      <EmptyMedia variant="icon">
        <FileAudio />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{t('detail.audio.emptyTitle')}</EmptyTitle>
        <EmptyDescription>
          {canManage
            ? t('detail.audio.uploadHint')
            : t('detail.audio.waitingHint')}
        </EmptyDescription>
      </EmptyHeader>
      {canManage ? (
        <EmptyContent>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_AUDIO_PICKER_TYPES}
            onChange={handleChange}
            className="hidden"
            data-testid="recording-audio-input"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            data-testid="recording-audio-upload"
          >
            {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
            {t('detail.audio.upload')}
          </Button>
          <PendingUploadItems uploads={uploads} />
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
