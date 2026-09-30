import { useRef, useState } from 'react';
import { Fragment } from 'react/jsx-runtime';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from '@ayunis/ui/components/card';
import { Button } from '@ayunis/ui/components/button';
import { ItemGroup, ItemSeparator } from '@ayunis/ui/components/item';
import type {
  KnowledgeBaseDocumentResponseDto,
  ReindexIntervalDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { Upload, Globe, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { cn } from '@ayunis/ui/lib/cn';
import { useDocumentDrop } from '@/shared/hooks/useDocumentDrop';
import type { AddUrlInput } from '@/widgets/knowledge-base-documents-card/model/types';
import { AddUrlDialog } from './AddUrlDialog';
import { DocumentItem } from './DocumentItem';
import { ReindexScheduleDialog } from './ReindexScheduleDialog';

const ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.pptx',
  '.odt',
  '.odp',
  '.txt',
  '.md',
  '.eml',
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
  removeDocument: (id: string) => void;
  isRemoving: boolean;
  addUrlAsync?: (input: AddUrlInput) => Promise<unknown>;
  isAddingUrl?: boolean;
  setReindexScheduleAsync?: (
    documentId: string,
    reindexInterval: ReindexIntervalDto | null,
  ) => Promise<unknown>;
  isSettingReindexSchedule?: boolean;
}

export default function KnowledgeBaseDocumentsCard({
  disabled = false,
  controller,
}: Readonly<{
  disabled?: boolean;
  controller: KnowledgeBaseDocumentsController;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const { t: tCommon } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [scheduleDocumentId, setScheduleDocumentId] = useState<string | null>(
    null,
  );
  const {
    documents,
    isLoading,
    uploadDocument,
    isUploading,
    removeDocument,
    isRemoving,
    addUrlAsync,
    isAddingUrl = false,
    setReindexScheduleAsync,
    isSettingReindexSchedule = false,
  } = controller;
  const scheduleDocument = documents.find(
    (doc) => doc.id === scheduleDocumentId,
  );

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
              {addUrlAsync ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUrlDialogOpen(true)}
                  disabled={isAddingUrl}
                  data-testid="knowledge-base-add-url"
                >
                  {isAddingUrl ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Globe />
                  )}
                  {t('detail.documents.addUrl')}
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload />
                )}
                {t('detail.documents.upload')}
              </Button>
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <DocumentsContent
          isLoading={isLoading}
          documents={documents}
          removeDocument={removeDocument}
          isRemoving={isRemoving}
          emptyText={t('detail.documents.empty')}
          disabled={disabled}
          onEditReindexSchedule={
            setReindexScheduleAsync
              ? (doc) => setScheduleDocumentId(doc.id)
              : undefined
          }
        />
      </CardContent>
      {addUrlAsync ? (
        <AddUrlDialog
          open={urlDialogOpen}
          onOpenChange={setUrlDialogOpen}
          onSubmit={addUrlAsync}
          isAddingUrl={isAddingUrl}
        />
      ) : null}
      {setReindexScheduleAsync && scheduleDocument ? (
        <ReindexScheduleDialog
          key={scheduleDocument.id}
          document={scheduleDocument}
          onOpenChange={(open) => {
            if (!open) setScheduleDocumentId(null);
          }}
          onSubmit={setReindexScheduleAsync}
          isSaving={isSettingReindexSchedule}
        />
      ) : null}
    </Card>
  );
}

function DocumentsContent({
  isLoading,
  documents,
  removeDocument,
  isRemoving,
  emptyText,
  disabled = false,
  onEditReindexSchedule,
}: Readonly<{
  isLoading: boolean;
  documents: KnowledgeBaseDocumentResponseDto[];
  removeDocument: (id: string) => void;
  isRemoving: boolean;
  emptyText: string;
  disabled?: boolean;
  onEditReindexSchedule?: (doc: KnowledgeBaseDocumentResponseDto) => void;
}>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {emptyText}
      </p>
    );
  }
  return (
    <ItemGroup>
      {documents.map((doc, index) => (
        <Fragment key={doc.id}>
          <DocumentItem
            doc={doc}
            removeDocument={removeDocument}
            isRemoving={isRemoving}
            onEditReindexSchedule={onEditReindexSchedule}
            disabled={disabled}
          />
          {index < documents.length - 1 && <ItemSeparator />}
        </Fragment>
      ))}
    </ItemGroup>
  );
}
