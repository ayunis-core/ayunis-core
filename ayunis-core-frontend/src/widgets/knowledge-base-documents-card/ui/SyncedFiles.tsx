import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { ItemGroup } from '@ayunis/ui/components/item';
import type { KnowledgeBaseDocumentResponseDto } from '@ayunis/api-client/schemas';
import { paginateItems } from '@/shared/lib/paginate-items';
import { DocumentItem } from './DocumentItem';

const PAGE_SIZE = 10;

/** A synced location's documents, a page at a time. */
export function SyncedFiles({
  files,
  removeDocument,
  isRemoving,
}: Readonly<{
  files: KnowledgeBaseDocumentResponseDto[];
  removeDocument: (id: string) => void;
  isRemoving: boolean;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const [page, setPage] = useState(1);
  const { pageItems, currentPage, totalPages } = paginateItems(
    files,
    page,
    PAGE_SIZE,
  );
  const first = (currentPage - 1) * PAGE_SIZE + 1;

  return (
    <>
      <ItemGroup>
        {pageItems.map((file) => (
          <DocumentItem
            key={file.id}
            doc={file}
            removeDocument={removeDocument}
            isRemoving={isRemoving}
            disabled
          />
        ))}
      </ItemGroup>
      {totalPages > 1 && (
        <div
          className="flex items-center justify-end gap-2 px-4 py-2 text-sm text-muted-foreground"
          data-testid="synced-location-files-pagination"
        >
          {t('detail.syncedLocations.filesRange', {
            first,
            last: first + pageItems.length - 1,
            total: files.length,
          })}
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('detail.syncedLocations.previousFiles')}
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('detail.syncedLocations.nextFiles')}
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
