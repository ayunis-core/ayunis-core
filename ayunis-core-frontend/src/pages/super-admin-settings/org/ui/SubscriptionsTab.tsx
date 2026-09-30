import type { SubscriptionResponseDto } from '@/shared/api';
import { SubscriptionResponseDtoType } from '@/shared/api';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { ClockIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LicenseSeatsSection from './LicenseSeatsSection';
import CreditBudgetSection from './CreditBudgetSection';
import BillingInfoSection from './BillingInfoSection';
import SubscriptionCancellationSection from './SubscriptionCancellationSection';
import ChangeSubscriptionDialog from './ChangeSubscriptionDialog';
import NoSubscriptionSection from './NoSubscriptionSection';
import SubscriptionHistorySection from './SubscriptionHistorySection';
import type { SubscriptionHistoryItem } from '@/pages/super-admin-settings/org/model/types';

interface SubscriptionsTabProps {
  orgId: string;
  subscription: SubscriptionResponseDto | null;
  subscriptionHistory: SubscriptionHistoryItem[];
  activeSubscriptionCount: number;
}

export default function SubscriptionsTab({
  orgId,
  subscription,
  subscriptionHistory,
  activeSubscriptionCount,
}: Readonly<SubscriptionsTabProps>) {
  const { t } = useTranslation('super-admin-settings-org');

  if (!subscription) {
    return <NoSubscriptionSection orgId={orgId} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ChangeSubscriptionDialog
          orgId={orgId}
          trigger={
            <Button variant="outline">
              {t('changeSubscriptionDialog.changeButton')}
            </Button>
          }
        />
      </div>
      {new Date(subscription.startsAt) > new Date() && (
        <Alert>
          <ClockIcon className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            <Badge variant="outline">{t('subscription.scheduled')}</Badge>
            {t('subscription.scheduledDescription', {
              date: new Date(subscription.startsAt).toLocaleDateString(),
            })}
          </AlertDescription>
        </Alert>
      )}
      {subscription.type === SubscriptionResponseDtoType.SEAT_BASED && (
        <LicenseSeatsSection subscription={subscription} orgId={orgId} />
      )}
      {subscription.type === SubscriptionResponseDtoType.USAGE_BASED &&
        subscription.monthlyCredits !== undefined && (
          <CreditBudgetSection
            orgId={orgId}
            monthlyCredits={subscription.monthlyCredits ?? 0}
          />
        )}
      <BillingInfoSection subscription={subscription} orgId={orgId} />
      <SubscriptionCancellationSection
        subscription={subscription}
        orgId={orgId}
      />
      <SubscriptionHistorySection
        subscriptions={subscriptionHistory}
        activeCount={activeSubscriptionCount}
      />
    </div>
  );
}
