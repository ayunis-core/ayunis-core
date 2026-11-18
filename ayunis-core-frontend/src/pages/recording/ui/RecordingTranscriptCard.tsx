import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
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
import { useRecordingTranscript } from '@/pages/recording/api';
import { formatTranscriptTime } from '@/pages/recording/lib/format-transcript-time';
import {
  RecordingAudioEmpty,
  type RecordingAudioUpload,
} from './RecordingAudioEmpty';
import { RecordingTranscriptionState } from './RecordingTranscriptionState';

/** Status, audio upload and transcript of a recording. */
export function RecordingTranscriptCard({
  recording,
  canManage,
  audioUpload,
}: Readonly<{
  recording: RecordingResponseDto;
  canManage: boolean;
  audioUpload: RecordingAudioUpload;
}>) {
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
        {status === 'uploading' ? null : (
          <CardAction>
            <Badge
              variant={status === 'failed' ? 'destructive' : 'secondary'}
              data-testid="recording-status"
              data-status={status}
            >
              {t(`detail.transcript.status.${status}`)}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'uploading' ? (
          <RecordingAudioEmpty
            canManage={canManage}
            audioUpload={audioUpload}
          />
        ) : null}
        <RecordingTranscriptionState recording={recording} />
        {isTranscribed && isLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : null}
        {turns.length > 0 ? <TranscriptTurns turns={turns} /> : null}
      </CardContent>
    </Card>
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
