import { useEffect, useRef, useState } from 'react';
import { Fragment } from 'react/jsx-runtime';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from '@/shared/ui/shadcn/card';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemMedia,
  ItemGroup,
  ItemSeparator,
} from '@/shared/ui/shadcn/item';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/shadcn/dialog';
import {
  KnowledgeBaseDocumentResponseDtoTextType,
  KnowledgeBaseDocumentResponseDtoStatus,
  type KnowledgeBaseDocumentResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  Upload,
  X,
  FileText,
  Globe,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import {
  useKnowledgeBaseDocuments,
  useUploadDocument,
  useAddUrl,
  useRemoveDocument,
} from '../api';

const ACCEPTED_FILE_TYPES = '.pdf,.docx,.pptx,.txt,.md';

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function KnowledgeBaseDocumentsCard({
  knowledgeBaseId,
  disabled = false,
}: Readonly<{
  knowledgeBaseId: string;
  disabled?: boolean;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const { documents, isLoading } = useKnowledgeBaseDocuments(knowledgeBaseId);
  const { uploadDocument, isUploading } = useUploadDocument(knowledgeBaseId);
  const { addUrlAsync, isAddingUrl } = useAddUrl(knowledgeBaseId);
  const { removeDocument, isRemoving } = useRemoveDocument(knowledgeBaseId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocument(file);
      e.target.value = '';
    }
  };

  const handleAddUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed || !isValidUrl(trimmed) || isAddingUrl) return;
    try {
      await addUrlAsync(trimmed);
      setUrlInput('');
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
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('detail.documents.title')}</CardTitle>
        <CardDescription>{t('detail.documents.description')}</CardDescription>
        {!disabled && (
          <CardAction>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex gap-2">
              <HelpLink
                path="knowledge-collections/create-and-upload/"
                variant="icon"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUrlDialogOpen(true)}
                disabled={isAddingUrl}
              >
                {isAddingUrl ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="mr-2 h-4 w-4" />
                )}
                {t('detail.documents.addUrl')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
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
        />
      </CardContent>
      <AddUrlDialog
        open={urlDialogOpen}
        onOpenChange={handleUrlDialogOpenChange}
        urlInput={urlInput}
        onUrlChange={setUrlInput}
        onSubmit={() => void handleAddUrl()}
        isAddingUrl={isAddingUrl}
        t={t}
      />
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
}: Readonly<{
  isLoading: boolean;
  documents: KnowledgeBaseDocumentResponseDto[];
  removeDocument: (id: string) => void;
  isRemoving: boolean;
  emptyText: string;
  disabled?: boolean;
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
            disabled={disabled}
          />
          {index < documents.length - 1 && <ItemSeparator />}
        </Fragment>
      ))}
    </ItemGroup>
  );
}

/** Processing sources older than this are shown with a slow-processing warning. */
const SLOW_PROCESSING_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

function DocumentItem({
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
        <DocumentItemDescription
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
      <ItemDescription variant={isProcessingSlow ? 'warning' : 'default'}>
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
          <ItemDescription variant="destructive" className="cursor-help">
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

function AddUrlDialog({
  open,
  onOpenChange,
  urlInput,
  onUrlChange,
  onSubmit,
  isAddingUrl,
  t,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urlInput: string;
  onUrlChange: (value: string) => void;
  onSubmit: () => void;
  isAddingUrl: boolean;
  t: (key: string) => string;
}>) {
  const isUrlValid = urlInput.trim() !== '' && isValidUrl(urlInput.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('detail.documents.urlDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('detail.documents.urlDialogDescription')}
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="add-url-input" className="sr-only">
            {t('detail.documents.urlLabel')}
          </Label>
          <Input
            id="add-url-input"
            type="url"
            placeholder={t('detail.documents.urlPlaceholder')}
            value={urlInput}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isUrlValid && !isAddingUrl) onSubmit();
            }}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAddingUrl}
          >
            {t('detail.documents.urlDialogCancel')}
          </Button>
          <Button onClick={onSubmit} disabled={!isUrlValid || isAddingUrl}>
            {isAddingUrl && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('detail.documents.addUrl')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
