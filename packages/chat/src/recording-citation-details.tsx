import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import type { SourceCitationRecordingResponseDto } from '@ayunis/api-client/schemas';
import type { ChatEvents } from './chat-config';
import { ChatLink } from './chat-link';
import { formatDate, formatTranscriptTime } from './citation-format';

/** When the cited recording was uploaded, where the excerpt lies in it, and a way to open it. */
export function RecordingCitationDetails({
  recording,
  events,
}: Readonly<{
  recording: SourceCitationRecordingResponseDto;
  events: ChatEvents;
}>) {
  const { t } = useTranslation('chat');
  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      <p>
        {t('chat.sourceCitation.recording.uploaded', {
          date: formatDate(recording.uploadedAt),
        })}
      </p>
      <p
        data-testid="source-citation-recording-position"
        data-position={recording.position}
      >
        <RecordingPosition recording={recording} />
      </p>
      {events.onNavigate && (
        <Button asChild variant="outline" size="sm" className="mt-2">
          <ChatLink
            to={{ kind: 'recording', recordingId: recording.id }}
            events={events}
            data-testid="source-citation-open-recording"
          >
            {t('chat.sourceCitation.recording.open')}
          </ChatLink>
        </Button>
      )}
    </div>
  );
}

function RecordingPosition({
  recording,
}: Readonly<{ recording: SourceCitationRecordingResponseDto }>) {
  const { t } = useTranslation('chat');
  if (recording.position === 'summary') {
    return t('chat.sourceCitation.recording.summary');
  }
  const range = t('chat.sourceCitation.recording.timeRange', {
    start: formatTranscriptTime(recording.start ?? 0),
    end: formatTranscriptTime(recording.end ?? 0),
  });
  const speakers = recording.speakerNumbers
    .map((number) => t('chat.sourceCitation.recording.speaker', { number }))
    .join(', ');
  return speakers ? `${range} · ${speakers}` : range;
}
