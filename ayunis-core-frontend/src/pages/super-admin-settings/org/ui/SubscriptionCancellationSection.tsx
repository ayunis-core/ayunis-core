import type { SubscriptionResponseDto } from '@/shared/api';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { ClockIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SubscriptionCancellationSection as SharedSubscriptionCancellationSection } from '@/widgets/subscription-cancellation-section';
import useSuperAdminSubscriptionCancel from '@/pages/super-admin-settings/org/api/useSuperAdminSubscriptionCancel';
import useSuperAdminSubscriptionUncancel from '@/pages/super-admin-settings/org/api/useSuperAdminSubscriptionUncancel';
import {
  toCalendarDateKey,
  utcDateToLocal,
} from '@/pages/super-admin-settings/org/lib/subscription-start-date';
import SubscriptionStartDateUpdateDialog from './SubscriptionStartDateUpdateDialog';

interface SubscriptionCancellationSectionProps {
  subscription: SubscriptionResponseDto;
  orgId: string;
  readOnly?: boolean;
}

function formatDate(value: string): string {
  return utcDateToLocal(value).toLocaleDateString();
}

export default function SubscriptionCancellationSection({
  subscription,
  orgId,
  readOnly = false,
}: Readonly<SubscriptionCancellationSectionProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const { cancelSubscription } = useSuperAdminSubscriptionCancel(orgId);
  const { uncancelSubscription } = useSuperAdminSubscriptionUncancel(orgId);

  const isScheduled = new Date(subscription.startsAt) > new Date();
  const startsAtFormatted = formatDate(subscription.startsAt);
  const nextRenewalDateFormatted = subscription.nextRenewalDate
    ? formatDate(subscription.nextRenewalDate)
    : null;
  const showNextRenewalDate =
    subscription.nextRenewalDate &&
    (!isScheduled ||
      toCalendarDateKey(subscription.startsAt) !==
        toCalendarDateKey(subscription.nextRenewalDate));

  return (
    <SharedSubscriptionCancellationSection
      readOnly={readOnly}
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
          {subscription.endsAt && (
            <p
              data-testid="subscription-access-end"
              className="text-sm text-muted-foreground"
            >
              {t('subscription.endsAt', {
                date: new Date(subscription.endsAt).toLocaleDateString(),
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
