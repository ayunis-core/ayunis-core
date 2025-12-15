// Utils
import { useTranslation } from 'react-i18next';

// Ui
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/ui/shadcn/card';

// Api
import { useUsageStats } from '@/features/usage';

interface UsageStatsCardsProps {
  startDate?: Date;
  endDate?: Date;
}

export function UsageStatsCards({ startDate, endDate }: UsageStatsCardsProps) {
  const { t, i18n } = useTranslation('admin-settings-usage');
  const { data: stats, isLoading } = useUsageStats({
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
  });

  const formatCompact = (value?: number) => {
    if (value === undefined) {
      return '-';
    }

    return new Intl.NumberFormat(i18n.language, {
      notation: 'compact',
      maximumFractionDigits: 1,
      compactDisplay: 'short',
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('stats.totalTokens')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">
            {formatCompact(stats.totalTokens)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('stats.activeUsers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">
            {formatCompact(stats.activeUsers)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
