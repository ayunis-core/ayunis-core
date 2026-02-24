import { useRef } from 'react';
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
import type { KnowledgeBaseDocumentResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useKnowledgeBaseDocuments,
  useUploadDocument,
  useRemoveDocument,
} from '../api';

const ACCEPTED_FILE_TYPES = '.pdf,.docx';

export default function KnowledgeBaseDocumentsCard({
  knowledgeBaseId,
}: Readonly<{
  knowledgeBaseId: string;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { documents, isLoading } = useKnowledgeBaseDocuments(knowledgeBaseId);
  const { uploadDocument, isUploading } = useUploadDocument(knowledgeBaseId);
  const { removeDocument, isRemoving } = useRemoveDocument(knowledgeBaseId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocument(file);
      e.target.value = '';
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
        <Badge
          key={doc.id}
          variant="secondary"
          className="flex items-center gap-1.5 py-1.5 px-3"
        >
          <FileText className="h-3.5 w-3.5" />
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
      ))}
    </div>
  );
}
