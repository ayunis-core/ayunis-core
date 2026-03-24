import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemActions,
  ItemMedia,
} from '@/shared/ui/shadcn/item';
import {
  KnowledgeBaseDocumentResponseDtoTextType,
  KnowledgeBaseDocumentResponseDtoStatus,
  type KnowledgeBaseDocumentResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
    <Item>
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
        <DocumentItemStatus
          isWeb={isWeb}
          url={doc.url}
          isProcessing={isProcessing}
          isProcessingSlow={isProcessingSlow}
          isFailed={isFailed}
          processingError={doc.processingError}
          t={t}
        />
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
