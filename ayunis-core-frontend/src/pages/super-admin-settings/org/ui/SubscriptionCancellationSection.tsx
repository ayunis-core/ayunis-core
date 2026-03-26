import type { SubscriptionResponseDto } from '@/shared/api';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import { ClockIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SubscriptionCancellationSection as SharedSubscriptionCancellationSection } from '@/widgets/subscription-cancellation-section';
import useSuperAdminSubscriptionCancel from '../api/useSuperAdminSubscriptionCancel';
import useSuperAdminSubscriptionUncancel from '../api/useSuperAdminSubscriptionUncancel';
import SubscriptionStartDateUpdateDialog from './SubscriptionStartDateUpdateDialog';
import { toCalendarDateKey } from '../lib/subscription-start-date';

interface SubscriptionCancellationSectionProps {
  subscription: SubscriptionResponseDto;
  orgId: string;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

export default function SubscriptionCancellationSection({
  subscription,
  orgId,
}: Readonly<SubscriptionCancellationSectionProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const { cancelSubscription } = useSuperAdminSubscriptionCancel(orgId);
  const { uncancelSubscription } = useSuperAdminSubscriptionUncancel(orgId);

  const isScheduled = new Date(subscription.startsAt) > new Date();
  const startsAtFormatted = formatDate(subscription.startsAt);
  const nextRenewalDateFormatted = formatDate(subscription.nextRenewalDate);
  const showNextRenewalDate =
    !isScheduled ||
    toCalendarDateKey(subscription.startsAt) !==
      toCalendarDateKey(subscription.nextRenewalDate);

  return (
    <SharedSubscriptionCancellationSection
      subscription={subscription}
      actions={{ cancelSubscription, uncancelSubscription }}
      t={t}
      renderStatusBadge={(currentSubscription) => {
        // eslint-disable-next-line eqeqeq -- intentional loose equality to catch both null and undefined from the API
        if (currentSubscription.cancelledAt != null) {
          return (
            <Badge variant="destructive">{t('subscription.cancelled')}</Badge>
          );
        }

        if (new Date(currentSubscription.startsAt) > new Date()) {
          return <Badge variant="outline">{t('subscription.scheduled')}</Badge>;
        }

        return <Badge variant="secondary">{t('subscription.active')}</Badge>;
      }}
      renderActiveActions={(cancelButton) => (
        <div className="flex items-center gap-2">
          <SubscriptionStartDateUpdateDialog
            orgId={orgId}
            subscription={subscription}
            trigger={
              <Button size="sm" variant="outline">
                {t('subscription.edit')}
              </Button>
            }
          />
          {cancelButton}
        </div>
      )}
      activeContent={
        <div className="space-y-2">
          {isScheduled && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ClockIcon className="h-4 w-4" />
              {t('subscription.scheduledDescription', {
                date: startsAtFormatted,
              })}
            </p>
          )}
          {showNextRenewalDate && (
            <p className="text-sm text-muted-foreground">
              {t('subscription.nextRenewalDate', {
                date: nextRenewalDateFormatted,
              })}
            </p>
          )}
        </div>
      }
    />
  );
}
