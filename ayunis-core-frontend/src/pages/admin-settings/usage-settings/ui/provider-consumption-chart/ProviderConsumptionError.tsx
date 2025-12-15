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
import { AlertCircle } from 'lucide-react';

interface ProviderConsumptionErrorProps {
  error: unknown;
}

export function ProviderConsumptionError({
  error,
}: ProviderConsumptionErrorProps) {
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
