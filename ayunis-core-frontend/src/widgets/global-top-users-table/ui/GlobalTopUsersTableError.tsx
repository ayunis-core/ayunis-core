import {
  Card,
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

interface GlobalTopUsersTableErrorProps {
  error: unknown;
}

export function GlobalTopUsersTableError({
  error,
}: Readonly<GlobalTopUsersTableErrorProps>) {
  const { t } = useTranslation('admin-settings-usage');
  const errorMessage =
    error instanceof Error ? error.message : t('charts.errorUnknown');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('globalTopUsers.title')}</CardTitle>
        <CardDescription>{t('globalTopUsers.description')}</CardDescription>
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
