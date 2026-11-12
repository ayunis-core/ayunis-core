import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import type { SourceCitationRecordingResponseDto } from '@/shared/api';
import { formatDate } from '@/shared/lib/format-date';
import { formatTranscriptTime } from '@/shared/lib/format-transcript-time';

/** When the cited recording was uploaded, where the excerpt lies in it, and a way to open it. */
export function RecordingCitationDetails({
  recording,
}: Readonly<{ recording: SourceCitationRecordingResponseDto }>) {
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
      <Button asChild variant="outline" size="sm" className="mt-2">
        <Link
          to="/recordings/$id"
          params={{ id: recording.id }}
          data-testid="source-citation-open-recording"
        >
          {t('chat.sourceCitation.recording.open')}
        </Link>
      </Button>
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
