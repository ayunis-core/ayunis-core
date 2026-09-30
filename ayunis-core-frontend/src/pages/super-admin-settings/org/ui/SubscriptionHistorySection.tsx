import type { TFunction } from 'i18next';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import { AlertTriangleIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/shared/lib/format-date';
import type { SubscriptionHistoryItem } from '@/pages/super-admin-settings/org/model/types';
import {
  shouldShowSubscriptionHistory,
  subscriptionHistoryBadgeVariant,
} from '@/pages/super-admin-settings/org/lib/subscription-history';

interface SubscriptionHistorySectionProps {
  subscriptions: SubscriptionHistoryItem[];
  activeCount: number;
}

export default function SubscriptionHistorySection({
  subscriptions,
  activeCount,
}: Readonly<SubscriptionHistorySectionProps>) {
  const { t } = useTranslation('super-admin-settings-org');

  if (!shouldShowSubscriptionHistory(subscriptions.length)) {
    return null;
  }

  return (
    <div className="space-y-4">
      {activeCount > 1 && (
        <Alert
          variant="warning"
          data-testid="subscription-multiple-active-alert"
        >
          <AlertTriangleIcon />
          <AlertDescription>
            {t('subscriptionHistory.multipleActive', { count: activeCount })}
          </AlertDescription>
        </Alert>
      )}
      <Card data-testid="subscription-history">
        <CardHeader>
          <CardTitle>{t('subscriptionHistory.title')}</CardTitle>
          <CardDescription>
            {t('subscriptionHistory.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('subscriptionHistory.columns.type')}</TableHead>
                <TableHead>{t('subscriptionHistory.columns.status')}</TableHead>
                <TableHead>
                  {t('subscriptionHistory.columns.createdAt')}
                </TableHead>
                <TableHead>
                  {t('subscriptionHistory.columns.startsAt')}
                </TableHead>
                <TableHead>
                  {t('subscriptionHistory.columns.cancelledAt')}
                </TableHead>
                <TableHead>
                  {t('subscriptionHistory.columns.details')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((subscription) => (
                <SubscriptionHistoryRow
                  key={subscription.id}
                  subscription={subscription}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SubscriptionHistoryRow({
  subscription,
}: Readonly<{ subscription: SubscriptionHistoryItem }>) {
  const { t } = useTranslation('super-admin-settings-org');

  return (
    <TableRow data-testid={`subscription-history-row-${subscription.id}`}>
      <TableCell>
        {t(`subscriptionHistory.types.${subscription.type}`)}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={subscriptionHistoryBadgeVariant(subscription.status)}
            data-testid={`subscription-history-status-${subscription.id}`}
          >
            {t(`subscriptionHistory.status.${subscription.status}`)}
          </Badge>
          {subscription.isLatest && (
            <Badge data-testid="subscription-history-latest">
              {t('subscriptionHistory.latest')}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>{formatDate(subscription.createdAt)}</TableCell>
      <TableCell>{formatDate(subscription.startsAt)}</TableCell>
      <TableCell>
        {subscription.cancelledAt
          ? formatDate(subscription.cancelledAt)
          : t('subscriptionHistory.notCancelled')}
      </TableCell>
      <TableCell>{subscriptionDetails(subscription, t)}</TableCell>
    </TableRow>
  );
}

function subscriptionDetails(
  subscription: SubscriptionHistoryItem,
  t: TFunction<'super-admin-settings-org'>,
): string {
  if (subscription.noOfSeats !== undefined) {
    return t('subscriptionHistory.details.seats', {
      count: subscription.noOfSeats,
    });
  }
  if (subscription.monthlyCredits !== undefined) {
    return t('subscriptionHistory.details.credits', {
      count: subscription.monthlyCredits,
    });
  }
  return t('subscriptionHistory.details.none');
}
