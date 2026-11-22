import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';

export function SyncedLocationsLoadError({
  onRetry,
}: Readonly<{ onRetry: () => unknown }>) {
  const { t } = useTranslation('knowledge-bases');
  return (
    <div
      className="mb-2 flex items-center gap-1 text-sm text-destructive"
      data-testid="knowledge-base-synced-locations-load-error"
    >
      <span>{t('detail.syncedLocations.loadError')}</span>
      <Button variant="link" size="sm" onClick={() => void onRetry()}>
        {t('detail.syncedLocations.retry')}
      </Button>
    </div>
  );
}
