import { useRef, useState, type RefObject } from 'react';
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
} from '@ayunis/api-client/schemas';
import { formatDate } from '@/shared/lib/format-date';
import { Markdown, SourceCitationProvider } from '@/widgets/markdown';
import {
  useRecordingSummary,
  useRecordingTranscript,
  useRetryRecordingSummary,
} from '@/pages/recording/api';
import {
  turnIndexOfCitation,
  withNamedParticipants,
  withTimeReferences,
  withoutActionItems,
} from '@/pages/recording/lib/summary-enhancements';
import {
  applySpeakerNames,
  speakerNumbersOf,
} from '@/pages/recording/lib/apply-speaker-names';
import { useEditedSummary } from '@/pages/recording/model/useEditedSummary';
import type { SpeakerNamesState } from '@/pages/recording/model/useSpeakerNames';
import { getRecordingSummaryFailureReason } from '@/pages/recording/lib/recording-summary-failure';
import {
  copyRichText,
  htmlDocument,
  printAsPdf,
} from '@/pages/recording/lib/recording-export';
import { RecordingExportActions } from './RecordingExportActions';
import { RecordingSummaryEditor } from './RecordingSummaryEditor';
import { SpeakersReviewHint } from './SpeakersReviewHint';
import {
  RecordingAudioEmpty,
  type RecordingAudioUpload,
} from './RecordingAudioEmpty';
import { RecordingTranscriptionState } from './RecordingTranscriptionState';

/** The minutes generated from the transcript, or why they are missing. */
export function RecordingSummaryCard({
  recording,
  canManage,
  audioUpload,
  speakers,
  onReviewSpeakers,
  onShowTurn,
}: Readonly<{
  recording: RecordingResponseDto;
  canManage: boolean;
  audioUpload: RecordingAudioUpload;
  speakers: SpeakerNamesState;
  onReviewSpeakers: () => void;
  onShowTurn: (turnIndex: number) => void;
}>) {
  const { t } = useTranslation('recordings');
  const { summary } = recording;
  const speakerNames = speakers.names;
  const contentRef = useRef<HTMLDivElement>(null);
  const { content: generated, isLoading } = useRecordingSummary(
    recording.id,
    summary?.status === 'ready',
  );
  const { turns } = useRecordingTranscript(
    recording.id,
    recording.status === 'summarizing' || recording.status === 'ready',
  );
  const { edited, save } = useEditedSummary(recording.id);
  const [isEditing, setIsEditing] = useState(false);
  const plain =
    generated &&
    applySpeakerNames(
      edited ??
        withoutActionItems(withNamedParticipants(generated, speakerNames)),
      speakerNames,
      (number) => t('detail.transcript.speaker', { number }),
    );
  const speakerNumbers = speakerNumbersOf(turns);
  const unnamed = speakerNumbers.filter(
    (number) => !speakerNames[number]?.trim(),
  ).length;
  const content = plain && withTimeReferences(plain, turns);

  return (
    <Card
      data-testid="recording-summary-card"
      data-summary-status={summary?.status}
    >
      <CardHeader>
        <CardTitle>{t('detail.summary.title')}</CardTitle>
        <CardDescription>
          {summary?.status === 'ready' && summary.generatedAt
            ? t('detail.summary.generatedWith', {
                model: summary.modelName ?? '',
                date: formatDate(summary.generatedAt),
              })
            : t('detail.summary.description')}
        </CardDescription>
        {summary?.status === 'failed' && canManage ? (
          <CardAction>
            <RetryButton recordingId={recording.id} />
          </CardAction>
        ) : null}
        {plain && !isEditing ? (
          <CardAction>
            <SummaryExportActions
              recordingName={recording.name}
              markdown={plain}
              contentRef={contentRef}
              onEdit={() => setIsEditing(true)}
            />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        <SpeakersReviewHint
          missing={isEditing ? 0 : unnamed}
          total={speakerNumbers.length}
          onReview={onReviewSpeakers}
        />
        {recording.status === 'uploading' ? (
          <RecordingAudioEmpty
            canManage={canManage}
            audioUpload={audioUpload}
          />
        ) : null}
        {plain && isEditing ? (
          <RecordingSummaryEditor
            initial={plain}
            onCancel={() => setIsEditing(false)}
            onSave={(next) => {
              save(next);
              setIsEditing(false);
            }}
          />
        ) : null}
        {summary && !isEditing ? (
          <SummaryState
            summary={summary}
            content={content}
            isLoading={isLoading}
            contentRef={contentRef}
            onShowTurn={onShowTurn}
          />
        ) : null}
        {summary ? null : <RecordingTranscriptionState recording={recording} />}
      </CardContent>
    </Card>
  );
}

function SummaryExportActions({
  recordingName,
  markdown,
  contentRef,
  onEdit,
}: Readonly<{
  recordingName: string;
  markdown: string;
  contentRef: RefObject<HTMLDivElement | null>;
  onEdit: () => void;
}>) {
  const { t } = useTranslation('recordings');
  const title = `${recordingName} – ${t('detail.summary.title')}`;
  const renderedHtml = () => {
    const copy = contentRef.current?.cloneNode(true) as HTMLElement | undefined;
    copy
      ?.querySelectorAll('[data-testid="source-citation"]')
      .forEach((reference) => reference.remove());
    return copy?.innerHTML ?? '';
  };

  return (
    <RecordingExportActions
      testIdPrefix="recording-summary"
      onEdit={onEdit}
      downloadLabel={t('detail.export.downloadSummary')}
      onCopy={() => copyRichText(htmlDocument(title, renderedHtml()), markdown)}
      onDownload={() => printAsPdf(title, renderedHtml())}
    />
  );
}

function SummaryState({
  summary,
  content,
  isLoading,
  contentRef,
  onShowTurn,
}: Readonly<{
  summary: RecordingSummaryStateDto;
  content: string | undefined;
  isLoading: boolean;
  contentRef: RefObject<HTMLDivElement | null>;
  onShowTurn: (turnIndex: number) => void;
}>) {
  const { t } = useTranslation('recordings');

  return (
    <>
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
        <div ref={contentRef} data-testid="recording-summary-content">
          <SourceCitationProvider
            onCitationClick={(citation) =>
              onShowTurn(turnIndexOfCitation(citation.chunkId))
            }
          >
            <Markdown
              renderImages={false}
              renderSourceCitations
              className="text-sm"
            >
              {content}
            </Markdown>
          </SourceCitationProvider>
        </div>
      ) : null}
    </>
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
