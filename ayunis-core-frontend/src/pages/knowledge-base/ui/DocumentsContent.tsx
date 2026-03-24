import type { KnowledgeBaseDocumentResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { Loader2 } from 'lucide-react';
import { DocumentItem } from './DocumentItem';

export function DocumentsContent({
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
    <div className="flex flex-wrap gap-2">
      {documents.map((doc) => (
        <DocumentItem
          key={doc.id}
          doc={doc}
          removeDocument={removeDocument}
          isRemoving={isRemoving}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
