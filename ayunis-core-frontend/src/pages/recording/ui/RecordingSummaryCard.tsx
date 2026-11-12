import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
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
  RecordingSummaryStateDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { formatDate } from '@/shared/lib/format-date';
import { Markdown } from '@/widgets/markdown';
import {
  useRecordingSummary,
  useRetryRecordingSummary,
} from '@/pages/recording/api';
import { getRecordingSummaryFailureReason } from '@/pages/recording/lib/recording-summary-failure';

/** The minutes generated from the transcript, or why they are missing. */
export function RecordingSummaryCard({
  recording,
  summary,
  canManage,
}: Readonly<{
  recording: RecordingResponseDto;
  summary: RecordingSummaryStateDto;
  canManage: boolean;
}>) {
  const { t } = useTranslation('recordings');
  const { content, isLoading } = useRecordingSummary(
    recording.id,
    summary.status === 'ready',
  );

  return (
    <Card
      data-testid="recording-summary-card"
      data-summary-status={summary.status}
    >
      <CardHeader>
        <CardTitle>{t('detail.summary.title')}</CardTitle>
        <CardDescription>
          {summary.status === 'ready' && summary.generatedAt
            ? t('detail.summary.generatedWith', {
                model: summary.modelName ?? '',
                date: formatDate(summary.generatedAt),
              })
            : t('detail.summary.description')}
        </CardDescription>
        {summary.status === 'failed' && canManage ? (
          <CardAction>
            <RetryButton recordingId={recording.id} />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {summary.status === 'summarizing' ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t('detail.summary.summarizing')}
          </p>
        ) : null}
        {summary.status === 'failed' ? (
          <Alert
            variant="destructive"
            data-testid="recording-summary-failure"
            data-failure-code={summary.failureCode}
          >
            <AlertCircle />
            <AlertDescription>
              {t(
                `detail.summary.failure.${getRecordingSummaryFailureReason(summary.failureCode)}`,
              )}
            </AlertDescription>
          </Alert>
        ) : null}
        {isLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : null}
        {content ? (
          <div data-testid="recording-summary-content">
            <Markdown renderImages={false} className="text-sm">
              {content}
            </Markdown>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RetryButton({ recordingId }: Readonly<{ recordingId: string }>) {
  const { t } = useTranslation('recordings');
  const retry = useRetryRecordingSummary(recordingId);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => retry.mutate()}
      disabled={retry.isPending}
      data-testid="recording-summary-retry"
    >
      {retry.isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
      {t('detail.summary.retry')}
    </Button>
  );
}
