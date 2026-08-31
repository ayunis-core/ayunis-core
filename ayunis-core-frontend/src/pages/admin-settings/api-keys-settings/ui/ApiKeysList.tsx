import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, Coins, MoreHorizontal, Trash2 } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { formatDate } from '@/shared/lib/format-date';
import { useRemoveApiKeyCreditLimit } from '@/pages/admin-settings/api-keys-settings/api/useRemoveApiKeyCreditLimit';
import { useRevokeApiKey } from '@/pages/admin-settings/api-keys-settings/api/useRevokeApiKey';
import type {
  ApiKey,
  ApiKeyCreditLimit,
} from '@/pages/admin-settings/api-keys-settings/model/types';
import { ApiKeysEmptyState } from './ApiKeysEmptyState';
import { SetApiKeyCreditLimitDialog } from './SetApiKeyCreditLimitDialog';

interface ApiKeysListProps {
  apiKeys: ApiKey[];
  creditLimits: ApiKeyCreditLimit[];
  canManageCreditLimits?: boolean;
}

export function ApiKeysList({
  apiKeys,
  creditLimits,
  canManageCreditLimits = true,
}: Readonly<ApiKeysListProps>) {
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);
  if (apiKeys.length === 0) return <ApiKeysEmptyState />;

  const limitsByApiKey = new Map(
    creditLimits.map((limit) => [limit.apiKeyId, limit]),
  );

  return (
    <>
      <div className="space-y-3">
        {apiKeys.map((apiKey) => (
          <ApiKeyListItem
            key={apiKey.id}
            apiKey={apiKey}
            creditLimit={limitsByApiKey.get(apiKey.id)}
            canManageCreditLimits={canManageCreditLimits}
            onManageCreditLimit={() => setSelectedApiKey(apiKey)}
          />
        ))}
      </div>
      <SetApiKeyCreditLimitDialog
        apiKey={selectedApiKey}
        creditLimit={
          selectedApiKey ? limitsByApiKey.get(selectedApiKey.id) : undefined
        }
        open={selectedApiKey !== null}
        onOpenChange={(open) => !open && setSelectedApiKey(null)}
      />
    </>
  );
}

interface ApiKeyListItemProps {
  apiKey: ApiKey;
  creditLimit?: ApiKeyCreditLimit;
  canManageCreditLimits: boolean;
  onManageCreditLimit: () => void;
}

function ApiKeyListItem({
  apiKey,
  creditLimit,
  canManageCreditLimits,
  onManageCreditLimit,
}: Readonly<ApiKeyListItemProps>) {
  const { t } = useTranslation('admin-settings-api-keys');
  const { removeApiKeyCreditLimit, isRemoving } = useRemoveApiKeyCreditLimit();
  const { revokeApiKey, isRevoking } = useRevokeApiKey();
  const isRevoked = apiKey.revokedAt !== null;
  const isLoading = isRemoving || isRevoking(apiKey.id);

  return (
    <Item variant="outline" data-testid={`api-key-item-${apiKey.id}`}>
      <ItemContent>
        <div className="flex items-center gap-2">
          <ItemTitle>{apiKey.name}</ItemTitle>
          {isRevoked && (
            <Badge variant="secondary">{t('apiKeys.list.revokedBadge')}</Badge>
          )}
        </div>
        <ApiKeyDetails apiKey={apiKey} creditLimit={creditLimit} />
      </ItemContent>
      {!isRevoked && (
        <ItemActions>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                disabled={isLoading}
                aria-label={t('apiKeys.list.actionsAriaLabel', {
                  name: apiKey.name,
                })}
                data-testid="api-key-actions-menu"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canManageCreditLimits && (
                <DropdownMenuItem
                  onClick={onManageCreditLimit}
                  disabled={isLoading}
                  data-testid="api-key-credit-limit-manage"
                >
                  <Coins />
                  {creditLimit
                    ? t('apiKeys.creditLimit.edit')
                    : t('apiKeys.creditLimit.set')}
                </DropdownMenuItem>
              )}
              {canManageCreditLimits && creditLimit && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => removeApiKeyCreditLimit(apiKey.id)}
                  disabled={isLoading}
                  data-testid="api-key-credit-limit-remove"
                >
                  <Ban />
                  {t('apiKeys.creditLimit.remove')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                variant="destructive"
                onClick={() => revokeApiKey(apiKey.id, apiKey.name)}
                disabled={isLoading}
                data-testid="api-key-revoke"
              >
                <Trash2 />
                {t('apiKeys.revokeApiKey.confirmText')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ItemActions>
      )}
    </Item>
  );
}

function ApiKeyDetails({
  apiKey,
  creditLimit,
}: Readonly<{ apiKey: ApiKey; creditLimit?: ApiKeyCreditLimit }>) {
  const { t } = useTranslation('admin-settings-api-keys');
  const lifecycleText = apiKey.revokedAt
    ? t('apiKeys.list.revokedAt', { date: formatDate(apiKey.revokedAt) })
    : getActiveLifecycleText(apiKey, t);
  const creditText = creditLimit
    ? t('apiKeys.creditLimit.usage', {
        used: Math.round(creditLimit.creditsUsed).toLocaleString(),
        limit: Math.round(creditLimit.monthlyCredits).toLocaleString(),
      })
    : t('apiKeys.creditLimit.unlimited');

  return (
    <>
      <ItemDescription>
        <span className="font-mono">{apiKey.prefixPreview}</span>
        {' · '}
        {t('apiKeys.list.createdAt', { date: formatDate(apiKey.createdAt) })}
        {' · '}
        {lifecycleText}
      </ItemDescription>
      <ItemDescription data-testid="api-key-credit-usage">
        {creditText}
      </ItemDescription>
    </>
  );
}

function getActiveLifecycleText(
  apiKey: ApiKey,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  return apiKey.expiresAt
    ? t('apiKeys.list.expiresAt', { date: formatDate(apiKey.expiresAt) })
    : t('apiKeys.list.neverExpires');
}
