import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  FolderSync,
  Globe,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Progress } from '@ayunis/ui/components/progress';
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
import {
  SyncedLocationProvider,
  type SyncedLocationResponseDto,
} from '@ayunis/api-client/schemas';
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
  files,
  progress,
}: Readonly<{
  location: SyncedLocationResponseDto;
  /** How many of its documents finished processing, of all it has. */
  progress: { processed: number; total: number };
  /** The location's documents, shown when its document count is opened. */
  files: ReactNode;
  disabled: boolean;
  onSyncNow: () => void;
  isRequestingSync: boolean;
  onRemove: () => void;
  isRemoving: boolean;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const { confirm } = useConfirmation();
  const { name, path } = syncedLocationLabel(location);
  const isSyncing = location.syncingSince !== null;
  const isWebsite = location.provider === SyncedLocationProvider.web;
  const Icon = isWebsite ? Globe : FolderSync;

  const confirmRemove = () =>
    confirm({
      title: t('detail.syncedLocations.confirmRemove.title'),
      description: t(
        isWebsite
          ? 'detail.syncedLocations.confirmRemove.descriptionWebsite'
          : 'detail.syncedLocations.confirmRemove.description',
        {
          name,
          count: location.documentCount,
        },
      ),
      confirmText: t('detail.syncedLocations.confirmRemove.confirmText'),
      cancelText: t('detail.syncedLocations.confirmRemove.cancelText'),
      variant: 'destructive',
      onConfirm: onRemove,
    });

  return (
    <Collapsible>
      <Item
        data-testid={`synced-location-${location.id}`}
        data-provider={location.provider}
        data-sync-state={syncedLocationStatus(location).kind}
      >
        <ItemMedia variant="icon">
          <Icon className="h-3.5 w-3.5 shrink-0" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>
            <span className="[overflow-wrap:anywhere]">{name}</span>
            <a
              href={location.location}
              target="_blank"
              rel="noreferrer"
              aria-label={t(
                isWebsite
                  ? 'detail.syncedLocations.website.open'
                  : 'detail.syncedLocations.openInSharePoint',
              )}
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </ItemTitle>
          <ItemDescription>{path}</ItemDescription>
          <div className="grid gap-1 text-sm text-muted-foreground">
            <SyncStatus location={location} />
            <ProcessingProgress {...progress} />
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
      <CollapsibleContent
        className="ml-10 border-l pl-2"
        data-testid={`synced-location-files-${location.id}`}
      >
        {files}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ProcessingProgress({
  processed,
  total,
}: Readonly<{ processed: number; total: number }>) {
  const { t } = useTranslation('knowledge-bases');
  if (processed >= total) return null;
  return (
    <div
      className="flex max-w-sm items-center gap-2"
      data-testid="synced-location-progress"
    >
      <Progress value={(processed / total) * 100} />
      <span className="shrink-0 tabular-nums">
        {t('detail.syncedLocations.progress', { processed, total })}
      </span>
    </div>
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
    case 'last_sync_failed':
      return (
        <p className="text-destructive">
          {status.lastSucceededAt
            ? t('detail.syncedLocations.status.lastSyncFailed', {
                time: formatRelativeDate(status.lastSucceededAt, i18n.language),
              })
            : t('detail.syncedLocations.status.firstSyncFailed')}
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
        {location.documentCount > 0 ? (
          <CollapsibleTrigger
            className="group inline-flex items-center gap-1 hover:text-foreground"
            data-testid="synced-location-files-toggle"
          >
            {t('detail.syncedLocations.documents', {
              count: location.documentCount,
            })}
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
        ) : (
          t('detail.syncedLocations.documents', { count: 0 })
        )}
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
