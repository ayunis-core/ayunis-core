import { useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/ui/shadcn/card';
import { Button } from '@/shared/ui/shadcn/button';
import { Badge } from '@/shared/ui/shadcn/badge';
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('detail.documents.title')}</CardTitle>
            <CardDescription>
              {t('detail.documents.description')}
            </CardDescription>
          </div>
          <div>
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('detail.documents.empty')}
          </p>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
