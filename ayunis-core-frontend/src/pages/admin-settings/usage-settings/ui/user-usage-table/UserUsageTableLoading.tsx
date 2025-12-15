import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/shared/ui/shadcn/card';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { useTranslation } from 'react-i18next';

export function UserUsageTableLoading() {
  const { t } = useTranslation('admin-settings-usage');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('userUsage.title')}</CardTitle>
        <CardDescription>{t('userUsage.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
