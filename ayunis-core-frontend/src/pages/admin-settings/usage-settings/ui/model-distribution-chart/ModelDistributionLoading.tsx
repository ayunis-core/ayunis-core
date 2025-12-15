import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/ui/shadcn/card';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
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
