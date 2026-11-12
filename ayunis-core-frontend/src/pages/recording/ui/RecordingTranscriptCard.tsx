import { useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import type {
  RecordingResponseDto,
  RecordingTranscriptTurnDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { ACCEPTED_AUDIO_PICKER_TYPES } from '@/shared/lib/audio-files';
import { getSourceProcessingErrorReason } from '@/shared/lib/source-processing-error';
import { PendingUploadItems } from '@/shared/ui/pending-upload-items';
import { useUploadRecordingAudio } from '@/features/recording-audio';
import { useRecordingTranscript } from '@/pages/recording/api';
import { formatTranscriptTime } from '@/shared/lib/format-transcript-time';

/** Status, audio upload and transcript of a recording. */
export function RecordingTranscriptCard({
  recording,
  canManage,
}: Readonly<{ recording: RecordingResponseDto; canManage: boolean }>) {
  const { t } = useTranslation('recordings');
  const { status } = recording;
  const isTranscribed = status === 'summarizing' || status === 'ready';
  const { turns, isLoading } = useRecordingTranscript(
    recording.id,
    isTranscribed,
  );

  return (
    <Card data-testid="recording-transcript-card">
      <CardHeader>
        <CardTitle>{t('detail.transcript.title')}</CardTitle>
        <CardDescription>{t('detail.transcript.description')}</CardDescription>
        <CardAction>
          <Badge
            variant={status === 'failed' ? 'destructive' : 'secondary'}
            data-testid="recording-status"
            data-status={status}
          >
            {t(`detail.transcript.status.${status}`)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'uploading' ? (
          <AudioUpload recordingId={recording.id} canManage={canManage} />
        ) : null}
        {status === 'transcribing' ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t('detail.transcript.transcribing')}
          </p>
        ) : null}
        {status === 'failed' ? (
          <Alert
            variant="destructive"
            data-testid="recording-failure"
            data-failure-code={recording.failureCode}
          >
            <AlertCircle />
            <AlertDescription>
              {t(
                `detail.transcript.failure.${getSourceProcessingErrorReason(recording.failureCode)}`,
              )}
            </AlertDescription>
          </Alert>
        ) : null}
        {isTranscribed && isLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : null}
        {turns.length > 0 ? <TranscriptTurns turns={turns} /> : null}
      </CardContent>
    </Card>
  );
}

function AudioUpload({
  recordingId,
  canManage,
}: Readonly<{ recordingId: string; canManage: boolean }>) {
  const { t } = useTranslation('recordings');
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadAudio, uploads, isUploading } =
    useUploadRecordingAudio(recordingId);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) uploadAudio(file);
  };

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('detail.transcript.noAudio')}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t('detail.transcript.uploadHint')}
      </p>
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
        {t('detail.transcript.upload')}
      </Button>
      <PendingUploadItems uploads={uploads} />
    </div>
  );
}

function TranscriptTurns({
  turns,
}: Readonly<{ turns: RecordingTranscriptTurnDto[] }>) {
  const { t } = useTranslation('recordings');
  return (
    <ol className="space-y-4" data-testid="recording-transcript">
      {turns.map((turn, index) => (
        <li
          key={`${turn.start}-${index}`}
          className="space-y-1"
          data-testid="recording-transcript-turn"
          data-speaker={turn.speakerId}
        >
          <p className="text-xs text-muted-foreground">
            <span
              className="font-medium text-foreground"
              data-testid="recording-transcript-speaker"
            >
              {turn.speakerNumber === undefined
                ? t('detail.transcript.unknownSpeaker')
                : t('detail.transcript.speaker', {
                    number: turn.speakerNumber,
                  })}
            </span>{' '}
            <time data-testid="recording-transcript-time">
              {formatTranscriptTime(turn.start)}
            </time>
          </p>
          <p className="text-sm">{turn.text}</p>
        </li>
      ))}
    </ol>
  );
}
