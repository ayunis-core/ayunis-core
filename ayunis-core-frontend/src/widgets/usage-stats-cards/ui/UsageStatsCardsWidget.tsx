import { useTranslation } from 'react-i18next';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/ui/shadcn/card';
import { UsageStatsCardsLoading } from './UsageStatsCardsLoading';

interface UsageStats {
  totalTokens?: number;
  activeUsers?: number;
}

interface UsageStatsCardsWidgetProps {
  stats: UsageStats | undefined;
  isLoading: boolean;
}

export function UsageStatsCardsWidget({
  stats,
  isLoading,
}: UsageStatsCardsWidgetProps) {
  const { t, i18n } = useTranslation('admin-settings-usage');

  const formatCompact = (value?: number) => {
    if (value === undefined) return '-';
    return new Intl.NumberFormat(i18n.language, {
      notation: 'compact',
      maximumFractionDigits: 1,
      compactDisplay: 'short',
    }).format(value);
  };

  if (isLoading) return <UsageStatsCardsLoading />;
  if (!stats) return null;

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
