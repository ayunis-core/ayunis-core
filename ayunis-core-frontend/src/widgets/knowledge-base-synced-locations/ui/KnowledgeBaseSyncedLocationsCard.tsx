import { useState } from 'react';
import { Fragment } from 'react/jsx-runtime';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { ItemGroup, ItemSeparator } from '@ayunis/ui/components/item';
import { ConnectorProduct } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import { useRemoveSyncedLocation } from '@/widgets/knowledge-base-synced-locations/api/useRemoveSyncedLocation';
import { useSyncLocationNow } from '@/widgets/knowledge-base-synced-locations/api/useSyncLocationNow';
import { useSyncedLocations } from '@/widgets/knowledge-base-synced-locations/api/useSyncedLocations';
import { AddSharePointLocationDialog } from './AddSharePointLocationDialog';
import { SyncedLocationItem } from './SyncedLocationItem';

/**
 * The SharePoint locations a knowledge base syncs. Shown while connectors are
 * on, to readers once there is a location, to editors once there is one or
 * Microsoft 365 is set up.
 */
export function KnowledgeBaseSyncedLocationsCard({
  knowledgeBaseId,
  disabled = false,
}: Readonly<{ knowledgeBaseId: string; disabled?: boolean }>) {
  const { t } = useTranslation('knowledge-bases');
  const enabled = useIsFeatureEnabled('connectorsEnabled');
  const [syncRequestedAt, setSyncRequestedAt] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { locations, availableProducts, isLoading, loadFailed, refetch } =
    useSyncedLocations(knowledgeBaseId, { enabled, syncRequestedAt });
  const requestSync = () => setSyncRequestedAt(Date.now());
  const { syncNow, isRequestingSync } = useSyncLocationNow(
    knowledgeBaseId,
    requestSync,
  );
  const { removeLocation, isRemoving } =
    useRemoveSyncedLocation(knowledgeBaseId);
  const canAdd =
    !disabled && availableProducts.includes(ConnectorProduct.microsoft_365);

  if (!enabled || isLoading) return null;
  if (loadFailed) return <SyncedLocationsLoadError onRetry={refetch} />;
  if (locations.length === 0 && !canAdd) return null;

  return (
    <Card data-testid="knowledge-base-synced-locations">
      <CardHeader>
        <CardTitle>{t('detail.syncedLocations.title')}</CardTitle>
        <CardDescription>
          {t('detail.syncedLocations.description')}
        </CardDescription>
        {canAdd && (
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="knowledge-base-synced-locations-add"
                >
                  <Plus />
                  {t('detail.syncedLocations.addSource')}
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  data-testid="knowledge-base-synced-locations-add-sharepoint"
                  onSelect={() => setDialogOpen(true)}
                >
                  {t('detail.syncedLocations.sharePoint')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {locations.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('detail.syncedLocations.empty')}
          </p>
        ) : (
          <ItemGroup>
            {locations.map((location, index) => (
              <Fragment key={location.id}>
                <SyncedLocationItem
                  location={location}
                  disabled={disabled}
                  onSyncNow={() => syncNow(location.id)}
                  isRequestingSync={isRequestingSync}
                  onRemove={() => removeLocation(location.id)}
                  isRemoving={isRemoving}
                />
                {index < locations.length - 1 && <ItemSeparator />}
              </Fragment>
            ))}
          </ItemGroup>
        )}
      </CardContent>
      {canAdd && (
        <AddSharePointLocationDialog
          knowledgeBaseId={knowledgeBaseId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onAdded={requestSync}
        />
      )}
    </Card>
  );
}

function SyncedLocationsLoadError({
  onRetry,
}: Readonly<{ onRetry: () => unknown }>) {
  const { t } = useTranslation('knowledge-bases');
  return (
    <Card data-testid="knowledge-base-synced-locations">
      <CardHeader>
        <CardTitle>{t('detail.syncedLocations.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center p-8 text-center">
          <p className="mb-4 text-sm text-destructive">
            {t('detail.syncedLocations.loadError')}
          </p>
          <Button variant="link" onClick={() => void onRetry()}>
            {t('detail.syncedLocations.retry')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
