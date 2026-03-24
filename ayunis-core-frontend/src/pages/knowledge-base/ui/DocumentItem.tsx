import { useEffect, useState } from 'react';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import {
  KnowledgeBaseDocumentResponseDtoTextType,
  KnowledgeBaseDocumentResponseDtoStatus,
  type KnowledgeBaseDocumentResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/shadcn/utils';
import { DocumentItemIcon } from './DocumentItemIcon';
import { DocumentItemStatus } from './DocumentItemStatus';

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
    <Badge
      variant={isFailed ? 'destructive' : 'secondary'}
      className={cn('flex items-center gap-1.5 py-1.5 px-3')}
      title={isWeb ? (doc.url ?? undefined) : undefined}
    >
      <DocumentItemIcon
        isWeb={isWeb}
        isProcessing={isProcessing}
        isProcessingSlow={isProcessingSlow}
        isFailed={isFailed}
      />
      <span className="max-w-[200px] truncate">{doc.name}</span>
      <DocumentItemStatus
        isProcessing={isProcessing}
        isProcessingSlow={isProcessingSlow}
        isFailed={isFailed}
        processingError={doc.processingError}
        t={t}
      />
      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removeDocument(doc.id)}
          disabled={isRemoving}
          className="ml-1 h-5 w-5 rounded-full"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Badge>
  );
}
