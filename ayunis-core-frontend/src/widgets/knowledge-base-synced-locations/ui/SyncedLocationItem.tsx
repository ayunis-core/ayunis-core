import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  FolderSync,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ayunis/ui/components/collapsible';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import type { SyncedLocationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { formatRelativeDate } from '@/shared/lib/format-relative-date';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { syncedLocationLabel } from '@/widgets/knowledge-base-synced-locations/lib/synced-location-label';
import { syncedLocationStatus } from '@/widgets/knowledge-base-synced-locations/lib/synced-location-status';

export function SyncedLocationItem({
  location,
  disabled,
  onSyncNow,
  isRequestingSync,
  onRemove,
  isRemoving,
}: Readonly<{
  location: SyncedLocationResponseDto;
  disabled: boolean;
  onSyncNow: () => void;
  isRequestingSync: boolean;
  onRemove: () => void;
  isRemoving: boolean;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const { confirm } = useConfirmation();
  const { name, path } = syncedLocationLabel(location.location);
  const isSyncing = location.syncingSince !== null;

  const confirmRemove = () =>
    confirm({
      title: t('detail.syncedLocations.confirmRemove.title'),
      description: t('detail.syncedLocations.confirmRemove.description', {
        name,
        count: location.documentCount,
      }),
      confirmText: t('detail.syncedLocations.confirmRemove.confirmText'),
      cancelText: t('detail.syncedLocations.confirmRemove.cancelText'),
      variant: 'destructive',
      onConfirm: onRemove,
    });

  return (
    <Item
      data-testid={`synced-location-${location.id}`}
      data-sync-state={syncedLocationStatus(location).kind}
    >
      <ItemMedia variant="icon">
        <FolderSync className="h-3.5 w-3.5 shrink-0" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <span className="[overflow-wrap:anywhere]">{name}</span>
          <a
            href={location.location}
            target="_blank"
            rel="noreferrer"
            aria-label={t('detail.syncedLocations.openInSharePoint')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </ItemTitle>
        <ItemDescription>{path}</ItemDescription>
        <div className="grid gap-1 text-sm text-muted-foreground">
          <SyncStatus location={location} />
          <FileCounts location={location} />
          <SkippedFiles location={location} />
        </div>
      </ItemContent>
      {!disabled && (
        <ItemActions>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-testid="synced-location-sync-now"
                aria-label={t('detail.syncedLocations.syncNow')}
                onClick={onSyncNow}
                disabled={isSyncing || isRequestingSync}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('detail.syncedLocations.syncNow')}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-testid="synced-location-remove"
                aria-label={t('detail.syncedLocations.remove')}
                onClick={confirmRemove}
                disabled={isRemoving}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('detail.syncedLocations.remove')}
            </TooltipContent>
          </Tooltip>
        </ItemActions>
      )}
    </Item>
  );
}

function SyncStatus({
  location,
}: Readonly<{ location: SyncedLocationResponseDto }>) {
  const { t, i18n } = useTranslation('knowledge-bases');
  const status = syncedLocationStatus(location);
  switch (status.kind) {
    case 'no_longer_accessible':
      return (
        <p className="text-destructive">
          {t('detail.syncedLocations.status.noLongerAccessible')}
        </p>
      );
    case 'paused':
      return (
        <p className="text-warning">
          {t('detail.syncedLocations.status.paused', {
            time: formatRelativeDate(status.until, i18n.language),
          })}
        </p>
      );
    case 'syncing':
      return (
        <p className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('detail.syncedLocations.status.syncing')}
        </p>
      );
    case 'waiting':
      return <p>{t('detail.syncedLocations.status.waiting')}</p>;
    case 'synced':
      return (
        <p>
          {t('detail.syncedLocations.status.synced', {
            time: formatRelativeDate(status.at, i18n.language),
          })}
        </p>
      );
  }
}

function FileCounts({
  location,
}: Readonly<{ location: SyncedLocationResponseDto }>) {
  const { t } = useTranslation('knowledge-bases');
  return (
    <>
      <p>
        {t('detail.syncedLocations.documents', {
          count: location.documentCount,
        })}
        {location.failedCount > 0 && (
          <span className="text-destructive">
            {' · '}
            {t('detail.syncedLocations.failed', {
              count: location.failedCount,
            })}
          </span>
        )}
      </p>
      {location.notSyncedLimitReachedCount > 0 && (
        <p
          className="flex items-center gap-1.5 text-warning"
          data-testid="synced-location-limit-reached"
        >
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {t('detail.syncedLocations.limitReached', {
            count: location.notSyncedLimitReachedCount,
          })}
        </p>
      )}
    </>
  );
}

function SkippedFiles({
  location,
}: Readonly<{ location: SyncedLocationResponseDto }>) {
  const { t } = useTranslation('knowledge-bases');
  if (location.skippedCount === 0) return null;
  const hidden = location.skippedCount - location.skippedFiles.length;
  return (
    <Collapsible>
      <CollapsibleTrigger
        className="group flex items-center gap-1 hover:text-foreground"
        data-testid="synced-location-skipped"
      >
        {t('detail.syncedLocations.skipped', {
          count: location.skippedCount,
        })}
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-1 space-y-0.5">
          {location.skippedFiles.map((file) => (
            <li key={file.path} className="break-words">
              <span className="text-foreground">{file.path}</span>
              {' – '}
              {t(`detail.syncedLocations.skipReasons.${file.reason}`)}
            </li>
          ))}
          {hidden > 0 && (
            <li>
              {t('detail.syncedLocations.skippedMore', { count: hidden })}
            </li>
          )}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
