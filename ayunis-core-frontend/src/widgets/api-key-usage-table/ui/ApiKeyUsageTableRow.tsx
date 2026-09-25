import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import { TableCell, TableRow } from '@ayunis/ui/components/table';
import type { ApiKeyUsageDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { formatCompactNumber } from '@/shared/lib/formatCompactNumber';
import { formatRelativeDate } from '@/shared/lib/format-relative-date';
import { getApiKeyStatus } from '@/widgets/api-key-usage-table/lib/get-api-key-status';

interface ApiKeyUsageTableRowProps {
  apiKey: ApiKeyUsageDto;
  now: Date;
}

export function ApiKeyUsageTableRow({
  apiKey,
  now,
}: Readonly<ApiKeyUsageTableRowProps>) {
  const { t, i18n } = useTranslation('admin-settings-usage');
  const status = getApiKeyStatus(apiKey, now);
  const formatCompact = (value: number) =>
    formatCompactNumber(value, i18n.language);

  return (
    <TableRow
      className="border-border/20 transition hover:bg-muted/20"
      data-testid={`api-key-usage-row-${apiKey.apiKeyId}`}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{apiKey.name}</span>
          {status !== 'active' && (
            <Badge variant="secondary">
              {t(`apiKeyUsage.status.${status}`)}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium" data-testid="api-key-usage-total-tokens">
          {formatCompact(apiKey.totalTokens)}
        </div>
        <div className="text-xs text-muted-foreground">
          {t('apiKeyUsage.tokenSplit', {
            input: formatCompact(apiKey.inputTokens),
            output: formatCompact(apiKey.outputTokens),
          })}
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium" data-testid="api-key-usage-requests">
          {formatCompact(apiKey.requests)}
        </div>
      </TableCell>
      <TableCell>
        <ApiKeyCredits apiKey={apiKey} formatCompact={formatCompact} />
      </TableCell>
      <TableCell>
        <span className="text-sm">
          {apiKey.lastUsedAt
            ? formatRelativeDate(apiKey.lastUsedAt, i18n.language)
            : '-'}
        </span>
      </TableCell>
    </TableRow>
  );
}

function ApiKeyCredits({
  apiKey,
  formatCompact,
}: Readonly<{
  apiKey: ApiKeyUsageDto;
  formatCompact: (value: number) => string;
}>) {
  const { t } = useTranslation('admin-settings-usage');

  if (apiKey.credits === null) {
    return (
      <div
        className="text-sm text-muted-foreground"
        data-testid="api-key-usage-credits"
      >
        {t('apiKeyUsage.creditsUnavailable')}
      </div>
    );
  }

  return (
    <>
      <div className="font-medium" data-testid="api-key-usage-credits">
        {formatCompact(apiKey.credits)}
      </div>
      {apiKey.unpricedRequests > 0 && (
        <div className="text-xs text-muted-foreground">
          {t('apiKeyUsage.unpricedRequests', {
            count: apiKey.unpricedRequests,
          })}
        </div>
      )}
    </>
  );
}
