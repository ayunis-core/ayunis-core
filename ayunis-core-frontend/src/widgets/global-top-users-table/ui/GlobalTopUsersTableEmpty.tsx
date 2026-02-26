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
import { Users } from 'lucide-react';

export function GlobalTopUsersTableEmpty() {
  const { t } = useTranslation('admin-settings-usage');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('globalTopUsers.title')}</CardTitle>
        <CardDescription>{t('globalTopUsers.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Empty>
          <EmptyMedia variant="icon">
            <Users className="text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t('globalTopUsers.empty')}</EmptyTitle>
            <EmptyDescription>{t('charts.noDataDescription')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}
