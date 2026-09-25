import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, KeyRound } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import type { ApiKeyUsageDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { ApiKeyUsageTableRow } from './ApiKeyUsageTableRow';

interface ApiKeyUsageTableWidgetProps {
  apiKeys: ApiKeyUsageDto[];
  isLoading: boolean;
  error: unknown;
}

export function ApiKeyUsageTableWidget({
  apiKeys,
  isLoading,
  error,
}: Readonly<ApiKeyUsageTableWidgetProps>) {
  const { t } = useTranslation('admin-settings-usage');

  return (
    <Card data-testid="api-key-usage-table">
      <CardHeader>
        <CardTitle>{t('apiKeyUsage.title')}</CardTitle>
        <CardDescription>{t('apiKeyUsage.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ApiKeyUsageTableBody
          apiKeys={apiKeys}
          isLoading={isLoading}
          error={error}
        />
      </CardContent>
    </Card>
  );
}

function ApiKeyUsageTableBody({
  apiKeys,
  isLoading,
  error,
}: Readonly<ApiKeyUsageTableWidgetProps>) {
  const { t } = useTranslation('admin-settings-usage');

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <StateMessage
        icon={<AlertCircle className="text-destructive" />}
        title={t('charts.errorTitle')}
        description={
          error instanceof Error ? error.message : t('apiKeyUsage.error')
        }
      />
    );
  }
  if (apiKeys.length === 0) {
    return (
      <StateMessage
        icon={<KeyRound className="text-muted-foreground" />}
        title={t('apiKeyUsage.noKeys')}
        description={t('apiKeyUsage.noKeysDescription')}
      />
    );
  }

  const now = new Date();
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/40">
          <TableHead>{t('apiKeyUsage.apiKey')}</TableHead>
          <TableHead>{t('apiKeyUsage.tokens')}</TableHead>
          <TableHead>{t('apiKeyUsage.requests')}</TableHead>
          <TableHead>{t('apiKeyUsage.credits')}</TableHead>
          <TableHead>{t('apiKeyUsage.lastUsed')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {apiKeys.map((apiKey) => (
          <ApiKeyUsageTableRow
            key={apiKey.apiKeyId}
            apiKey={apiKey}
            now={now}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function StateMessage({
  icon,
  title,
  description,
}: Readonly<{ icon: ReactNode; title: string; description: string }>) {
  return (
    <Empty>
      <EmptyMedia variant="icon">{icon}</EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
