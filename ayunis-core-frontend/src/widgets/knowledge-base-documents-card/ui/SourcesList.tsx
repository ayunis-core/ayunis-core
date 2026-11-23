import { Fragment, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { ItemGroup, ItemSeparator } from '@ayunis/ui/components/item';
import type { KnowledgeBaseDocumentResponseDto } from '@ayunis/api-client/schemas';
import { partitionDocuments } from '@/widgets/knowledge-base-documents-card/lib/partition-documents';
import type { SyncedSources } from '@/widgets/knowledge-base-documents-card/model/synced-sources';
import { DocumentItem } from './DocumentItem';
import { SyncedFiles } from './SyncedFiles';

export function SourcesList({
  isLoading,
  documents,
  synced,
  hasPendingUploads,
  removeDocument,
  isRemoving,
  emptyText,
  disabled,
}: Readonly<{
  isLoading: boolean;
  documents: KnowledgeBaseDocumentResponseDto[];
  synced?: SyncedSources;
  hasPendingUploads: boolean;
  removeDocument: (id: string) => void;
  isRemoving: boolean;
  emptyText: string;
  disabled: boolean;
}>) {
  if (isLoading || synced?.locations === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  const { locations, looseDocuments } = partitionDocuments(
    documents,
    synced?.locations ?? [],
  );
  const rows: { key: string; node: ReactNode }[] = [
    ...locations.map(({ location, files, processed, total }) => ({
      key: location.id,
      node: synced!.renderLocation(
        location,
        <SyncedFiles
          files={files}
          removeDocument={removeDocument}
          isRemoving={isRemoving}
        />,
        { processed, total },
      ),
    })),
    ...looseDocuments.map((doc) => ({
      key: doc.id,
      node: (
        <DocumentItem
          doc={doc}
          removeDocument={removeDocument}
          isRemoving={isRemoving}
          disabled={disabled}
        />
      ),
    })),
  ];

  if (rows.length === 0) {
    if (hasPendingUploads) return null;
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }
  return (
    <ItemGroup>
      {rows.map(({ key, node }, index) => (
        <Fragment key={key}>
          {node}
          {index < rows.length - 1 && <ItemSeparator />}
        </Fragment>
      ))}
    </ItemGroup>
  );
}
