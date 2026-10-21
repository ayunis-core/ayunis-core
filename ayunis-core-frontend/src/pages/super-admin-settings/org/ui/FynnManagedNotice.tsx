import { useFeatureToggles } from '@/features/feature-toggles';
import { Button } from '@ayunis/ui/components/button';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { useTranslation } from 'react-i18next';

export default function FynnManagedNotice() {
  const { t } = useTranslation('super-admin-settings-org');
  const { isLoading, error, refetch } = useFeatureToggles();
  let message = 'subscription.managedInFynn';
  if (isLoading) message = 'subscription.managementLoading';
  if (error) message = 'subscription.managementUnavailable';
  return (
    <Alert data-testid="fynn-managed-subscription-notice">
      <AlertDescription>
        {t(message)}
        {Boolean(error) && (
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {t('subscription.retryManagement')}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
