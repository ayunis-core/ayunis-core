import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemMedia,
} from '@ayunis/ui/components/item';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import {
  KnowledgeBaseDocumentResponseDtoTextType,
  KnowledgeBaseDocumentResponseDtoStatus,
  type KnowledgeBaseDocumentResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  X,
  FileText,
  Globe,
  Loader2,
  AlertCircle,
  Clock,
  CalendarClock,
} from 'lucide-react';
import { formatDate } from '@/shared/lib/format-date';
import { canScheduleReindex } from '@/widgets/knowledge-base-documents-card/lib/reindex-schedule';
import { DocumentReindexStatus } from './DocumentReindexStatus';

/** Processing sources older than this are shown with a slow-processing warning. */
const SLOW_PROCESSING_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

export function DocumentItem({
  doc,
  removeDocument,
  isRemoving,
  onEditReindexSchedule,
  disabled = false,
}: Readonly<{
  doc: KnowledgeBaseDocumentResponseDto;
  removeDocument: (id: string) => void;
  isRemoving: boolean;
  /** Absent when the scope offers no schedule editing. */
  onEditReindexSchedule?: (doc: KnowledgeBaseDocumentResponseDto) => void;
  disabled?: boolean;
}>) {
  const { t, i18n } = useTranslation('knowledge-bases');
  const isWeb = doc.textType === KnowledgeBaseDocumentResponseDtoTextType.web;
  const isProcessing =
    doc.status === KnowledgeBaseDocumentResponseDtoStatus.processing;
  const isFailed = doc.status === KnowledgeBaseDocumentResponseDtoStatus.failed;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isProcessing) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [isProcessing]);

  const isProcessingSlow =
    isProcessing &&
    now - new Date(doc.createdAt).getTime() > SLOW_PROCESSING_THRESHOLD_MS;

  const canEditSchedule =
    !disabled && onEditReindexSchedule !== undefined && canScheduleReindex(doc);

  return (
    <Item data-testid={`knowledge-base-document-${doc.id}`}>
      <ItemMedia variant="icon">
        <DocumentItemIcon
          isWeb={isWeb}
          isProcessing={isProcessing}
          isProcessingSlow={isProcessingSlow}
          isFailed={isFailed}
        />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{doc.name}</ItemTitle>
        <DocumentItemDescription
          isWeb={isWeb}
          url={doc.url}
          isProcessing={isProcessing}
          isProcessingSlow={isProcessingSlow}
          isFailed={isFailed}
          processingError={doc.processingError}
          t={t}
        />
        <DocumentReindexStatus doc={doc} />
        <ItemDescription>
          {t('detail.documents.addedAt', {
            date: formatDate(doc.createdAt, i18n.language),
          })}
        </ItemDescription>
      </ItemContent>
      {!disabled && (
        <ItemActions>
          {canEditSchedule && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('detail.documents.reindex.action')}
                  data-testid="knowledge-base-document-reindex-schedule"
                  onClick={() => onEditReindexSchedule(doc)}
                >
                  <CalendarClock className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('detail.documents.reindex.action')}
              </TooltipContent>
            </Tooltip>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeDocument(doc.id)}
            disabled={isRemoving}
          >
            <X className="h-4 w-4" />
          </Button>
        </ItemActions>
      )}
    </Item>
  );
}

function DocumentItemDescription({
  isWeb,
  url,
  isProcessing,
  isProcessingSlow,
  isFailed,
  processingError,
  t,
}: Readonly<{
  isWeb: boolean;
  url: string | null | undefined;
  isProcessing: boolean;
  isProcessingSlow: boolean;
  isFailed: boolean;
  processingError: string | null | undefined;
  t: (key: string) => string;
}>) {
  if (isProcessing) {
    return (
      <ItemDescription
        className={
          isProcessingSlow ? 'text-amber-600 dark:text-amber-400' : undefined
        }
      >
        {isProcessingSlow
          ? t('detail.documents.statusProcessingSlow')
          : t('detail.documents.statusProcessing')}
      </ItemDescription>
    );
  }
  if (isFailed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <ItemDescription className="text-destructive cursor-help">
            {t('detail.documents.statusFailed')}
          </ItemDescription>
        </TooltipTrigger>
        <TooltipContent>
          {processingError ?? t('detail.documents.retryUpload')}
        </TooltipContent>
      </Tooltip>
    );
  }
  if (isWeb && url) {
    return <ItemDescription>{url}</ItemDescription>;
  }
  return null;
}

function DocumentItemIcon({
  isWeb,
  isProcessing,
  isProcessingSlow,
  isFailed,
}: Readonly<{
  isWeb: boolean;
  isProcessing: boolean;
  isProcessingSlow: boolean;
  isFailed: boolean;
}>) {
  if (isProcessingSlow) {
    return (
      <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
    );
  }
  if (isProcessing) {
    return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />;
  }
  if (isFailed) {
    return <AlertCircle className="h-3.5 w-3.5 shrink-0" />;
  }
  const Icon = isWeb ? Globe : FileText;
  return <Icon className="h-3.5 w-3.5 shrink-0" />;
}
