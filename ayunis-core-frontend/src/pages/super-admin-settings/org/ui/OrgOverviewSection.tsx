import { useTranslation } from 'react-i18next';
import type {
  SubscriptionResponseDto,
  SuperAdminTrialResponseDto,
} from '@/shared/api';
import { SubscriptionResponseDtoType } from '@/shared/api';
import { Card } from '@/shared/ui/shadcn/card';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { cn } from '@/shared/lib/shadcn/utils';

interface OrgOverviewSectionProps {
  subscription: SubscriptionResponseDto | null;
  trial: SuperAdminTrialResponseDto | null;
  activeUsers: number | undefined;
  activeUsersLoading?: boolean;
}

export default function OrgOverviewSection({
  subscription,
  trial,
  activeUsers,
  activeUsersLoading,
}: Readonly<OrgOverviewSectionProps>) {
  const { t, i18n } = useTranslation('super-admin-settings-org');

  const formatNumber = (value: number) =>
    new Intl.NumberFormat(i18n.language).format(value);
  const formatCompact = (value: number) =>
    new Intl.NumberFormat(i18n.language, {
      notation: 'compact',
      maximumFractionDigits: 1,
      compactDisplay: 'short',
    }).format(value);

  const subscriptionStatus = getSubscriptionStatus(
    subscription,
    t,
    i18n.language,
  );
  const usageOrSeats = getUsageOrSeatsDisplay(
    subscription,
    t,
    formatNumber,
    formatCompact,
  );
  const trialStatus = getTrialStatus(trial, t, formatNumber);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label={t('overview.subscription')}
        value={subscriptionStatus.value}
        subtitle={subscriptionStatus.subtitle}
        dotClassName={subscriptionStatus.dotClassName}
      />
      <StatCard
        label={usageOrSeats.label}
        value={usageOrSeats.value}
        subtitle={usageOrSeats.subtitle}
        subtitleDestructive={usageOrSeats.subtitleDestructive}
      />
      <StatCard
        label={t('overview.trial')}
        value={trialStatus.value}
        subtitle={trialStatus.subtitle}
        subtitleDestructive={trialStatus.subtitleDestructive}
      />
      <StatCard
        label={t('overview.activeUsers')}
        value={
          activeUsers === undefined
            ? t('overview.empty')
            : formatNumber(activeUsers)
        }
        subtitle={t('overview.activeUsersHint')}
        loading={activeUsersLoading}
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  dotClassName?: string;
  subtitleDestructive?: boolean;
  loading?: boolean;
}

function StatCard({
  label,
  value,
  subtitle,
  dotClassName,
  subtitleDestructive,
  loading,
}: Readonly<StatCardProps>) {
  return (
    <Card className="gap-0 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
          {dotClassName && (
            <span
              aria-hidden="true"
              className={cn('size-2 rounded-full', dotClassName)}
            />
          )}
          {value}
        </p>
      )}
      {/* Empty subtitle slot is intentional — keeps all cards same height. */}
      <p
        className={cn(
          'text-xs',
          subtitleDestructive ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {subtitle ?? ' '}
      </p>
    </Card>
  );
}

function getSubscriptionStatus(
  subscription: SubscriptionResponseDto | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
  locale: string,
): { value: string; subtitle?: string; dotClassName?: string } {
  if (!subscription) {
    return {
      value: t('overview.subscriptionNone'),
      dotClassName: 'bg-muted-foreground/40',
    };
  }
  const typeLabel =
    subscription.type === SubscriptionResponseDtoType.SEAT_BASED
      ? t('overview.subscriptionTypeSeat')
      : t('overview.subscriptionTypeUsage');

  // Precedence: cancelled > scheduled > active.
  if (subscription.cancelledAt) {
    return {
      value: t('overview.subscriptionCancelled'),
      subtitle: typeLabel,
      dotClassName: 'bg-destructive',
    };
  }
  if (new Date(subscription.startsAt) > new Date()) {
    return {
      value: t('overview.subscriptionScheduled'),
      subtitle: t('overview.subscriptionScheduledFrom', {
        date: new Date(subscription.startsAt).toLocaleDateString(locale),
      }),
      dotClassName: 'bg-warning',
    };
  }
  return {
    value: t('overview.subscriptionActive'),
    subtitle: typeLabel,
    dotClassName: 'bg-green-500',
  };
}

function getUsageOrSeatsDisplay(
  subscription: SubscriptionResponseDto | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
  formatNumber: (value: number) => string,
  formatCompact: (value: number) => string,
): {
  label: string;
  value: string;
  subtitle?: string;
  subtitleDestructive?: boolean;
} {
  if (!subscription) {
    return { label: t('overview.seats'), value: t('overview.empty') };
  }
  if (subscription.type === SubscriptionResponseDtoType.SEAT_BASED) {
    const total = subscription.noOfSeats ?? 0;
    const available = subscription.availableSeats ?? total;
    const used = Math.max(total - available, 0);
    const limitReached = total > 0 && used >= total;
    return {
      label: t('overview.seats'),
      value: t('overview.seatsValue', {
        used: formatNumber(used),
        total: formatNumber(total),
      }),
      subtitle: limitReached ? t('overview.seatsLimitReached') : undefined,
      subtitleDestructive: limitReached,
    };
  }
  const credits = subscription.monthlyCredits;
  return {
    label: t('overview.credits'),
    value: credits === undefined ? t('overview.empty') : formatCompact(credits),
    subtitle: t('overview.creditsUnit'),
  };
}

function getTrialStatus(
  trial: SuperAdminTrialResponseDto | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
  formatNumber: (value: number) => string,
): { value: string; subtitle?: string; subtitleDestructive?: boolean } {
  if (!trial) {
    return { value: t('overview.trialNone') };
  }
  const limitReached = trial.messagesSent >= trial.maxMessages;
  return {
    value: t('overview.trialValue', {
      sent: formatNumber(trial.messagesSent),
      max: formatNumber(trial.maxMessages),
    }),
    subtitle: limitReached
      ? t('overview.trialLimitReached')
      : t('overview.trialUnit'),
    subtitleDestructive: limitReached,
  };
}
