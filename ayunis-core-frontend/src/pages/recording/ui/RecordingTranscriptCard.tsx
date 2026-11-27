import { useEffect, useRef } from 'react';
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
import { cn } from '@ayunis/ui/lib/cn';
import type {
  RecordingResponseDto,
  RecordingTranscriptTurnDto,
} from '@ayunis/api-client/schemas';
import { useRecordingTranscript } from '@/pages/recording/api';
import type {
  SpeakerNames,
  SpeakerNamesState,
} from '@/pages/recording/model/useSpeakerNames';
import { formatTranscriptTime } from '@/shared/lib/format-transcript-time';
import {
  RecordingAudioEmpty,
  type RecordingAudioUpload,
} from './RecordingAudioEmpty';
import { RecordingSpeakers } from './RecordingSpeakers';
import { RecordingTranscriptionState } from './RecordingTranscriptionState';
import type { SpeakerHints } from './SpeakerNameFields';

/** Status, audio upload and transcript of a recording. */
export function RecordingTranscriptCard({
  recording,
  canManage,
  audioUpload,
  speakers,
  speakerHints,
  highlightedTurn,
}: Readonly<{
  recording: RecordingResponseDto;
  canManage: boolean;
  audioUpload: RecordingAudioUpload;
  speakers: SpeakerNamesState;
  speakerHints: SpeakerHints;
  highlightedTurn: number | null;
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
        {turns.length > 0 ? (
          <>
            <RecordingSpeakers
              turns={turns}
              speakers={speakers}
              hints={speakerHints}
            />
            <TranscriptTurns
              turns={turns}
              speakerNames={speakers.names}
              highlightedTurn={highlightedTurn}
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TranscriptTurns({
  turns,
  speakerNames,
  highlightedTurn,
}: Readonly<{
  turns: RecordingTranscriptTurnDto[];
  speakerNames: SpeakerNames;
  highlightedTurn: number | null;
}>) {
  const { t } = useTranslation('recordings');
  const highlightedRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    highlightedRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [highlightedTurn]);
  const speakerLabel = (speakerNumber: number | undefined) => {
    if (speakerNumber === undefined) {
      return t('detail.transcript.unknownSpeaker');
    }
    return (
      speakerNames[speakerNumber]?.trim() ||
      t('detail.transcript.speaker', { number: speakerNumber })
    );
  };
  return (
    <ol className="space-y-2" data-testid="recording-transcript">
      {turns.map((turn, index) => (
        <li
          key={`${turn.start}-${index}`}
          ref={highlightedTurn === index ? highlightedRef : undefined}
          className={cn(
            '-mx-2 space-y-1 rounded-md px-2 py-1 transition-colors duration-500',
            highlightedTurn === index && 'bg-muted',
          )}
          data-testid="recording-transcript-turn"
          data-speaker={turn.speakerId}
        >
          <p className="text-xs text-muted-foreground">
            <span
              className="font-medium text-foreground"
              data-testid="recording-transcript-speaker"
            >
              {speakerLabel(turn.speakerNumber)}
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
