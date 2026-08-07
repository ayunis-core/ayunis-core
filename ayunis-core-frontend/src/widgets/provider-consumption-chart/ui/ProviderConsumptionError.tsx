import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@ayunis/ui/components/card';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@ayunis/ui/components/empty';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';

interface ProviderConsumptionErrorProps {
  error: unknown;
}

export function ProviderConsumptionError({
  error,
}: Readonly<ProviderConsumptionErrorProps>) {
  const { t } = useTranslation('admin-settings-usage');
  const errorMessage =
    error instanceof Error ? error.message : t('charts.errorUnknown');

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
            <AlertCircle className="text-destructive" />
          </EmptyMedia>

          <EmptyHeader>
            <EmptyTitle>{t('charts.errorTitle')}</EmptyTitle>
            <EmptyDescription>{errorMessage}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}
