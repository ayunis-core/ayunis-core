import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Clock, FileText, Globe, Loader2, X } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import {
  KnowledgeBaseDocumentResponseDtoStatus,
  KnowledgeBaseDocumentResponseDtoTextType,
  type KnowledgeBaseDocumentResponseDto,
  type SourceProcessingErrorCode,
} from '@ayunis/api-client/schemas';
import { formatDate } from '@/shared/lib/format-date';
import { getSourceProcessingErrorReason } from '@ayunis/chat/source-errors';

/** Processing sources older than this are shown with a slow-processing warning. */
const SLOW_PROCESSING_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

export function DocumentItem({
  doc,
  removeDocument,
  isRemoving,
  disabled = false,
}: Readonly<{
  doc: KnowledgeBaseDocumentResponseDto;
  removeDocument: (id: string) => void;
  isRemoving: boolean;
  disabled?: boolean;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const isWeb = doc.textType === KnowledgeBaseDocumentResponseDtoTextType.web;
  const isProcessing =
    doc.status === KnowledgeBaseDocumentResponseDtoStatus.processing;
  const isFailed = doc.status === KnowledgeBaseDocumentResponseDtoStatus.failed;
  const isReindexing =
    doc.status === KnowledgeBaseDocumentResponseDtoStatus.reindexing;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isProcessing) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [isProcessing]);

  const isProcessingSlow =
    isProcessing &&
    now - new Date(doc.createdAt).getTime() > SLOW_PROCESSING_THRESHOLD_MS;

  return (
    <Item
      data-testid={`knowledge-base-document-${doc.id}`}
      data-document-status={doc.status}
    >
      <ItemMedia variant="icon">
        <DocumentItemIcon
          isWeb={isWeb}
          isProcessing={isProcessing || isReindexing}
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
          isReindexing={isReindexing}
          processingErrorCode={doc.processingErrorCode}
          t={t}
        />
        <ItemDescription>
          {t('detail.documents.addedAt', {
            date: formatDate(doc.createdAt),
          })}
        </ItemDescription>
      </ItemContent>
      {!disabled && (
        <ItemActions>
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
  isReindexing,
  processingErrorCode,
  t,
}: Readonly<{
  isWeb: boolean;
  url: string | null | undefined;
  isProcessing: boolean;
  isProcessingSlow: boolean;
  isFailed: boolean;
  isReindexing: boolean;
  processingErrorCode: SourceProcessingErrorCode | undefined;
  t: (key: string) => string;
}>) {
  if (isReindexing) {
    return (
      <ItemDescription>
        {t('detail.documents.statusReindexing')}
      </ItemDescription>
    );
  }
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
          {t(
            `detail.documents.processingErrors.${getSourceProcessingErrorReason(processingErrorCode)}`,
          )}
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
