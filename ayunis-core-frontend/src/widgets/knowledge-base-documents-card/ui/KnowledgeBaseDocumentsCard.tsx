import { useRef, useState } from 'react';
import type { PendingSourceUpload } from '@/shared/lib/source-upload';
import { PendingUploadItems } from '@/shared/ui/pending-upload-items';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from '@ayunis/ui/components/card';
import {
  KnowledgeBaseDocumentResponseDtoStatus,
  type KnowledgeBaseDocumentResponseDto,
} from '@ayunis/api-client/schemas';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { cn } from '@ayunis/ui/lib/cn';
import { useDocumentDrop } from '@/shared/hooks/useDocumentDrop';
import { isValidUrl } from '@/widgets/knowledge-base-documents-card/lib/isValidUrl';
import type { SyncedSources } from '@/widgets/knowledge-base-documents-card/model/synced-sources';
import { AddUrlDialog } from './AddUrlDialog';
import { AddSourceMenu } from './AddSourceMenu';
import { RemoveFailedDocumentsButton } from './RemoveFailedDocumentsButton';
import { SourcesList } from './SourcesList';

const ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.pptx',
  '.odt',
  '.odp',
  '.csv',
  '.xlsx',
  '.xls',
  '.ods',
  '.txt',
  '.md',
  '.xml',
  '.html',
  '.htm',
  '.eml',
  '.msg',
  '.mp3',
  '.m4a',
  '.wav',
  '.webm',
];
const ACCEPTED_FILE_TYPES = ACCEPTED_EXTENSIONS.join(',');

export interface KnowledgeBaseDocumentsController {
  documents: KnowledgeBaseDocumentResponseDto[];
  isLoading: boolean;
  uploadDocument: (file: File) => void;
  isUploading: boolean;
  /** Files still being transferred to storage, before they become documents. */
  uploads?: PendingSourceUpload[];
  removeDocument: (id: string) => void;
  isRemoving: boolean;
  removeFailedDocuments: () => void;
  isRemovingFailed: boolean;
  addUrlAsync?: (url: string, depth: number) => Promise<unknown>;
  isAddingUrl?: boolean;
}

export default function KnowledgeBaseDocumentsCard({
  disabled = false,
  controller,
  synced,
}: Readonly<{
  disabled?: boolean;
  controller: KnowledgeBaseDocumentsController;
  synced?: SyncedSources;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const { t: tCommon } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlDepth, setUrlDepth] = useState(0);
  const {
    documents,
    isLoading,
    uploadDocument,
    isUploading,
    uploads = [],
    removeDocument,
    isRemoving,
    removeFailedDocuments,
    isRemovingFailed,
    addUrlAsync,
    isAddingUrl = false,
  } = controller;
  const failedCount = documents.filter(
    (doc) => doc.status === KnowledgeBaseDocumentResponseDtoStatus.failed,
  ).length;

  const { isDragging } = useDocumentDrop({
    containerRef: cardRef,
    onDrop: (files) => {
      for (const file of files) {
        uploadDocument(file);
      }
    },
    acceptedExtensions: ACCEPTED_EXTENSIONS,
    disabled,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        uploadDocument(file);
      }
      e.target.value = '';
    }
  };

  const handleAddUrl = async () => {
    const trimmed = urlInput.trim();
    if (!addUrlAsync || !trimmed || !isValidUrl(trimmed) || isAddingUrl) return;
    try {
      await addUrlAsync(trimmed, urlDepth);
      setUrlInput('');
      setUrlDepth(0);
      setUrlDialogOpen(false);
    } catch {
      // error toast is handled by the mutation's onError callback
    }
  };

  const handleUrlDialogOpenChange = (open: boolean) => {
    if (!open && isAddingUrl) return;
    setUrlDialogOpen(open);
    if (!open) {
      setUrlInput('');
      setUrlDepth(0);
    }
  };

  return (
    <Card
      ref={cardRef}
      data-testid="knowledge-base-documents-card"
      className={cn(
        'relative',
        isDragging && 'outline-2 outline-dashed outline-primary',
      )}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-primary/5">
          <p className="text-sm font-medium text-primary">
            {tCommon('chatInput.dropFilesHint')}
          </p>
        </div>
      )}
      <CardHeader>
        <CardTitle>{t('detail.documents.title')}</CardTitle>
        <CardDescription>{t('detail.documents.description')}</CardDescription>
        {!disabled && (
          <CardAction>
            <input
              data-testid="knowledge-base-document-upload-input"
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex gap-2">
              <HelpLink
                path="knowledge-collections/create-and-upload/"
                variant="icon"
              />
              <AddSourceMenu
                onUpload={() => fileInputRef.current?.click()}
                onAddUrl={
                  addUrlAsync ? () => setUrlDialogOpen(true) : undefined
                }
                entries={synced?.addMenuEntries}
                isBusy={isUploading || isAddingUrl}
              />
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {!disabled && (
          <RemoveFailedDocumentsButton
            failedCount={failedCount}
            removeFailedDocuments={removeFailedDocuments}
            isRemovingFailed={isRemovingFailed}
          />
        )}
        {synced?.notice}
        <PendingUploadItems uploads={uploads} />
        <SourcesList
          isLoading={isLoading}
          documents={documents}
          synced={synced}
          hasPendingUploads={uploads.length > 0}
          removeDocument={removeDocument}
          isRemoving={isRemoving}
          emptyText={t('detail.documents.empty')}
          disabled={disabled}
        />
      </CardContent>
      {addUrlAsync ? (
        <AddUrlDialog
          open={urlDialogOpen}
          onOpenChange={handleUrlDialogOpenChange}
          urlInput={urlInput}
          onUrlChange={setUrlInput}
          depth={urlDepth}
          onDepthChange={setUrlDepth}
          onSubmit={() => void handleAddUrl()}
          isAddingUrl={isAddingUrl}
          t={t}
        />
      ) : null}
      {synced?.dialogs}
    </Card>
  );
}
