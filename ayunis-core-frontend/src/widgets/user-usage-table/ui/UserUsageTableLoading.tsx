import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from '@ayunis/ui/components/card';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { useTranslation } from 'react-i18next';

interface UserUsageTableLoadingProps {
  headerAction?: React.ReactNode;
  description?: React.ReactNode;
}

export function UserUsageTableLoading({
  headerAction,
  description,
}: Readonly<UserUsageTableLoadingProps>) {
  const { t } = useTranslation('admin-settings-usage');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('userUsage.title')}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {headerAction && <CardAction>{headerAction}</CardAction>}
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
