import { useSyncExternalStore } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';
import {
  isRetryingThroughDeployGap,
  subscribeToDeployGap,
} from '@/shared/api/client';

export function DeployGapBanner() {
  const { t } = useTranslation('common');
  const retrying = useSyncExternalStore(
    subscribeToDeployGap,
    isRetryingThroughDeployGap,
  );

  if (!retrying) {
    return null;
  }

  return (
    <Alert
      role="status"
      data-testid="deploy-gap-banner"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 rounded-none border-x-0 border-t-0 shadow-sm"
    >
      <LoaderCircle aria-hidden="true" className="animate-spin" />
      <AlertTitle>{t('common.deployGapBanner.title')}</AlertTitle>
      <AlertDescription>
        {t('common.deployGapBanner.description')}
      </AlertDescription>
    </Alert>
  );
}
