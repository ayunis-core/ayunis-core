import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/ui/shadcn/card';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@/shared/ui/shadcn/empty';
import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react';

export function ProviderConsumptionEmpty() {
  const { t } = useTranslation('admin-settings-usage');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('charts.providerConsumption.title')}</CardTitle>
        <CardDescription>
          {t('charts.providerConsumption.description')}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Empty>
          <EmptyMedia variant="icon">
            <BarChart3 className="text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t('charts.noData')}</EmptyTitle>
            <EmptyDescription>{t('charts.noDataDescription')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}
