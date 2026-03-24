import { Fragment } from 'react/jsx-runtime';
import type { KnowledgeBaseDocumentResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { ItemGroup, ItemSeparator } from '@/shared/ui/shadcn/item';
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
