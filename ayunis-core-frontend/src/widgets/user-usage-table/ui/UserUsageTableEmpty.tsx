import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Users } from 'lucide-react';

interface UserUsageTableEmptyProps {
  headerAction?: React.ReactNode;
  description?: React.ReactNode;
}

export function UserUsageTableEmpty({
  headerAction,
  description,
}: Readonly<UserUsageTableEmptyProps>) {
  const { t } = useTranslation('admin-settings-usage');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('userUsage.title')}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {headerAction && <CardAction>{headerAction}</CardAction>}
      </CardHeader>
      <CardContent>
        <Empty>
          <EmptyMedia variant="icon">
            <Users className="text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t('userUsage.noData')}</EmptyTitle>
            <EmptyDescription>{t('charts.noDataDescription')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}
