import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import type { RecordingResponseDto } from '@ayunis/api-client/schemas';
import { getSourceProcessingErrorReason } from '@/shared/lib/source-processing-error';

/** Shown while the recording is transcribed or after its transcription failed. */
export function RecordingTranscriptionState({
  recording,
}: Readonly<{ recording: RecordingResponseDto }>) {
  const { t } = useTranslation('recordings');

  if (recording.status === 'transcribing') {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t('detail.transcript.transcribing')}
      </p>
    );
  }
  if (recording.status === 'failed') {
    return (
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
    );
  }
  return null;
}
