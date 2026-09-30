import { useTranslation } from 'react-i18next';
import { TriangleAlert } from 'lucide-react';
import { ItemDescription } from '@ayunis/ui/components/item';
import {
  KnowledgeBaseDocumentResponseDtoStatus,
  SourceProcessingErrorCode,
  type KnowledgeBaseDocumentResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { formatDate } from '@/shared/lib/format-date';
import { hasFailedSinceLastIndex } from '@/widgets/knowledge-base-documents-card/lib/reindex-schedule';

export function DocumentReindexStatus({
  doc,
}: Readonly<{ doc: KnowledgeBaseDocumentResponseDto }>) {
  if (doc.status !== KnowledgeBaseDocumentResponseDtoStatus.ready) return null;
  return (
    <>
      <ReindexFailureWarning doc={doc} />
      <ReindexScheduleSummary doc={doc} />
    </>
  );
}

function ReindexFailureWarning({
  doc,
}: Readonly<{ doc: KnowledgeBaseDocumentResponseDto }>) {
  const { t, i18n } = useTranslation('knowledge-bases');
  if (!doc.lastRunFailedAt || !hasFailedSinceLastIndex(doc)) return null;
  const failedAt = formatDate(doc.lastRunFailedAt, i18n.language);
  const reason =
    doc.lastRunErrorCode === SourceProcessingErrorCode.CONTENT_DEGRADED
      ? t('detail.documents.reindex.failureReason.contentDegraded')
      : t('detail.documents.reindex.failureReason.generic');
  return (
    <ItemDescription
      className="flex items-start gap-1.5 text-warning"
      data-testid="knowledge-base-document-reindex-warning"
    >
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {doc.lastIndexedAt
          ? t('detail.documents.reindex.failedWarning', {
              failedAt,
              indexedAt: formatDate(doc.lastIndexedAt, i18n.language),
            })
          : t('detail.documents.reindex.failedWarningNeverIndexed', {
              failedAt,
            })}{' '}
        {reason}
      </span>
    </ItemDescription>
  );
}

function ReindexScheduleSummary({
  doc,
}: Readonly<{ doc: KnowledgeBaseDocumentResponseDto }>) {
  const { t, i18n } = useTranslation('knowledge-bases');
  if (!doc.reindexInterval || !doc.nextReindexAt) return null;
  const interval = t(
    `detail.documents.reindex.interval.${doc.reindexInterval.unit}`,
    { count: doc.reindexInterval.value },
  );
  return (
    <ItemDescription data-testid="knowledge-base-document-reindex-summary">
      {t('detail.documents.reindex.summary', {
        interval,
        date: formatDate(doc.nextReindexAt, i18n.language),
      })}
    </ItemDescription>
  );
}
