import { useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from '@/shared/ui/shadcn/card';
import { Button } from '@/shared/ui/shadcn/button';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
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
  type KnowledgeBaseDocumentResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { Upload, X, FileText, Globe, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useKnowledgeBaseDocuments,
  useUploadDocument,
  useAddUrl,
  useRemoveDocument,
} from '../api';

const ACCEPTED_FILE_TYPES = '.pdf,.docx';

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
}: Readonly<{
  knowledgeBaseId: string;
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
        <CardAction>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex gap-2">
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
      </CardHeader>
      <CardContent>
        <DocumentsContent
          isLoading={isLoading}
          documents={documents}
          removeDocument={removeDocument}
          isRemoving={isRemoving}
          emptyText={t('detail.documents.empty')}
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
}: Readonly<{
  isLoading: boolean;
  documents: KnowledgeBaseDocumentResponseDto[];
  removeDocument: (id: string) => void;
  isRemoving: boolean;
  emptyText: string;
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
    <div className="flex flex-wrap gap-2">
      {documents.map((doc) => (
        <DocumentBadge
          key={doc.id}
          doc={doc}
          removeDocument={removeDocument}
          isRemoving={isRemoving}
        />
      ))}
    </div>
  );
}

function DocumentBadge({
  doc,
  removeDocument,
  isRemoving,
}: Readonly<{
  doc: KnowledgeBaseDocumentResponseDto;
  removeDocument: (id: string) => void;
  isRemoving: boolean;
}>) {
  const isWeb = doc.textType === KnowledgeBaseDocumentResponseDtoTextType.web;
  const Icon = isWeb ? Globe : FileText;

  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-1.5 py-1.5 px-3"
      title={isWeb ? (doc.url ?? undefined) : undefined}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="max-w-[200px] truncate">{doc.name}</span>
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
    </Badge>
  );
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
