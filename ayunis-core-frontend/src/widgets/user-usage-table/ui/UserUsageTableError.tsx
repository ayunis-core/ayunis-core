import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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

interface UserUsageTableErrorProps {
  error: unknown;
  headerAction?: React.ReactNode;
  description?: React.ReactNode;
}

export function UserUsageTableError({
  error,
  headerAction,
  description,
}: Readonly<UserUsageTableErrorProps>) {
  const { t } = useTranslation('admin-settings-usage');
  const errorMessage =
    error instanceof Error ? error.message : t('charts.errorUnknown');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('userUsage.title')}</CardTitle>
        <CardDescription>{description ?? t('userUsage.error')}</CardDescription>
        {headerAction && <CardAction>{headerAction}</CardAction>}
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
