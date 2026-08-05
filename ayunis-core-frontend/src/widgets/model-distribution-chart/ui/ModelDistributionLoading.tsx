import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@ayunis/ui/components/card';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { useTranslation } from 'react-i18next';

export function ModelDistributionLoading() {
  const { t } = useTranslation('admin-settings-usage');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('charts.modelDistribution.title')}</CardTitle>
        <CardDescription>
          {t('charts.modelDistribution.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}
