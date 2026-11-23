import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderSync, Globe } from 'lucide-react';
import {
  ConnectorProduct,
  type SyncedLocationResponseDto,
} from '@ayunis/api-client/schemas';
import { useRemoveSyncedLocation } from '@/widgets/knowledge-base-synced-locations/api/useRemoveSyncedLocation';
import { useSyncLocationNow } from '@/widgets/knowledge-base-synced-locations/api/useSyncLocationNow';
import { useSyncedLocations } from '@/widgets/knowledge-base-synced-locations/api/useSyncedLocations';
import { AddSharePointLocationDialog } from '@/widgets/knowledge-base-synced-locations/ui/AddSharePointLocationDialog';
import { AddWebsiteDialog } from '@/widgets/knowledge-base-synced-locations/ui/AddWebsiteDialog';
import { SyncedLocationItem } from '@/widgets/knowledge-base-synced-locations/ui/SyncedLocationItem';
import { SyncedLocationsLoadError } from '@/widgets/knowledge-base-synced-locations/ui/SyncedLocationsLoadError';

/**
 * The locations a knowledge base syncs, to show among its documents, and the
 * entries that add them: a website always, SharePoint while Microsoft 365 is
 * set up. While connectors are off, the backend leaves out the SharePoint
 * locations, so their documents show as ordinary documents.
 */
export function useSyncedSources(knowledgeBaseId: string, disabled: boolean) {
  const { t } = useTranslation('knowledge-bases');
  const [syncRequestedAt, setSyncRequestedAt] = useState<number | null>(null);
  const requestSync = () => setSyncRequestedAt(Date.now());
  const [openDialog, setOpenDialog] = useState<'website' | 'sharepoint' | null>(
    null,
  );
  const { locations, availableProducts, isLoading, loadFailed, refetch } =
    useSyncedLocations(knowledgeBaseId, { syncRequestedAt });
  const { syncNow, isRequestingSync } = useSyncLocationNow(
    knowledgeBaseId,
    requestSync,
  );
  const { removeLocation, isRemoving } =
    useRemoveSyncedLocation(knowledgeBaseId);
  const canAddSharePoint =
    !disabled && availableProducts.includes(ConnectorProduct.microsoft_365);

  return {
    locations: isLoading ? null : locations,
    addMenuEntries: disabled
      ? undefined
      : [
          {
            key: 'website',
            label: t('detail.syncedLocations.website.add'),
            icon: Globe,
            testId: 'knowledge-base-documents-add-url',
            openDialog: () => setOpenDialog('website'),
          },
          ...(canAddSharePoint
            ? [
                {
                  key: 'sharepoint',
                  label: t('detail.syncedLocations.sharePoint'),
                  icon: FolderSync,
                  testId: 'knowledge-base-synced-locations-add-sharepoint',
                  openDialog: () => setOpenDialog('sharepoint'),
                },
              ]
            : []),
        ],
    renderLocation: (
      location: SyncedLocationResponseDto,
      files: ReactNode,
      progress: { processed: number; total: number },
    ) => (
      <SyncedLocationItem
        location={location}
        disabled={disabled}
        onSyncNow={() => syncNow(location.id)}
        isRequestingSync={isRequestingSync}
        onRemove={() => removeLocation(location.id)}
        isRemoving={isRemoving}
        files={files}
        progress={progress}
      />
    ),
    notice: loadFailed ? <SyncedLocationsLoadError onRetry={refetch} /> : null,
    dialogs: disabled ? null : (
      <>
        <AddWebsiteDialog
          knowledgeBaseId={knowledgeBaseId}
          open={openDialog === 'website'}
          onOpenChange={(open) => setOpenDialog(open ? 'website' : null)}
          onAdded={requestSync}
        />
        {canAddSharePoint && (
          <AddSharePointLocationDialog
            knowledgeBaseId={knowledgeBaseId}
            open={openDialog === 'sharepoint'}
            onOpenChange={(open) => setOpenDialog(open ? 'sharepoint' : null)}
            onAdded={requestSync}
          />
        )}
      </>
    ),
  };
}
