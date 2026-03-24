import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/ui/shadcn/card';
import { useTranslation } from 'react-i18next';
import { useDocumentManager } from './useDocumentManager';
import { AddUrlDialog } from './AddUrlDialog';
import { DocumentActions } from './DocumentActions';
import { DocumentsContent } from './DocumentsContent';

export default function KnowledgeBaseDocumentsCard({
  knowledgeBaseId,
  disabled = false,
}: Readonly<{
  knowledgeBaseId: string;
  disabled?: boolean;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const mgr = useDocumentManager(knowledgeBaseId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('detail.documents.title')}</CardTitle>
        <CardDescription>{t('detail.documents.description')}</CardDescription>
        {!disabled && (
          <DocumentActions
            fileInputRef={mgr.fileInputRef}
            onFileChange={mgr.handleFileChange}
            onOpenUrlDialog={mgr.openUrlDialog}
            isUploading={mgr.isUploading}
            isAddingUrl={mgr.isAddingUrl}
            t={t}
          />
        )}
      </CardHeader>
      <CardContent>
        <DocumentsContent
          isLoading={mgr.isLoading}
          documents={mgr.documents}
          removeDocument={mgr.removeDocument}
          isRemoving={mgr.isRemoving}
          emptyText={t('detail.documents.empty')}
          disabled={disabled}
        />
      </CardContent>
      <AddUrlDialog
        open={mgr.urlDialogOpen}
        onOpenChange={mgr.handleUrlDialogOpenChange}
        urlInput={mgr.urlInput}
        onUrlChange={mgr.setUrlInput}
        onSubmit={() => void mgr.handleAddUrl()}
        isAddingUrl={mgr.isAddingUrl}
        t={t}
      />
    </Card>
  );
}
