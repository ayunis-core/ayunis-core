import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, ChevronRight, Coins, MoreHorizontal, Trash2 } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ayunis/ui/components/collapsible';
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
import {
  getApiKeyStatus,
  partitionApiKeys,
  type ApiKeyStatus,
} from '@/pages/admin-settings/api-keys-settings/lib/partition-api-keys';
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
  const { t } = useTranslation('admin-settings-api-keys');
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);
  if (apiKeys.length === 0) return <ApiKeysEmptyState />;

  const now = new Date();
  const { active, archived } = partitionApiKeys(apiKeys, now);
  const limitsByApiKey = new Map(
    creditLimits.map((limit) => [limit.apiKeyId, limit]),
  );

  return (
    <>
      <div className="space-y-3">
        {active.length === 0 && (
          <p
            className="text-muted-foreground text-sm"
            data-testid="api-key-no-active"
          >
            {t('apiKeys.list.noActiveKeys')}
          </p>
        )}
        {active.map((apiKey) => (
          <ApiKeyListItem
            key={apiKey.id}
            apiKey={apiKey}
            status="active"
            creditLimit={limitsByApiKey.get(apiKey.id)}
            canManageCreditLimits={canManageCreditLimits}
            onManageCreditLimit={() => setSelectedApiKey(apiKey)}
          />
        ))}
      </div>
      {archived.length > 0 && <ArchivedApiKeys apiKeys={archived} now={now} />}
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

function ArchivedApiKeys({
  apiKeys,
  now,
}: Readonly<{ apiKeys: ApiKey[]; now: Date }>) {
  const { t } = useTranslation('admin-settings-api-keys');

  return (
    <Collapsible className="group/archive">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2"
          data-testid="api-key-archive-toggle"
        >
          <ChevronRight className="transition-transform group-data-[state=open]/archive:rotate-90" />
          {t('apiKeys.list.archiveTitle', { count: apiKeys.length })}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent
        className="mt-3 space-y-3"
        data-testid="api-key-archive-list"
      >
        {apiKeys.map((apiKey) => (
          <ApiKeyListItem
            key={apiKey.id}
            apiKey={apiKey}
            status={getApiKeyStatus(apiKey, now)}
            canManageCreditLimits={false}
            onManageCreditLimit={() => undefined}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface ApiKeyListItemProps {
  apiKey: ApiKey;
  status: ApiKeyStatus;
  creditLimit?: ApiKeyCreditLimit;
  canManageCreditLimits: boolean;
  onManageCreditLimit: () => void;
}

function ApiKeyListItem({
  apiKey,
  status,
  creditLimit,
  canManageCreditLimits,
  onManageCreditLimit,
}: Readonly<ApiKeyListItemProps>) {
  const { t } = useTranslation('admin-settings-api-keys');
  const { removeApiKeyCreditLimit, isRemoving } = useRemoveApiKeyCreditLimit();
  const { revokeApiKey, isRevoking } = useRevokeApiKey();
  const isActive = status === 'active';
  const isLoading = isRemoving || isRevoking(apiKey.id);

  return (
    <Item variant="outline" data-testid={`api-key-item-${apiKey.id}`}>
      <ItemContent>
        <div className="flex items-center gap-2">
          <ItemTitle>{apiKey.name}</ItemTitle>
          {status === 'revoked' && (
            <Badge variant="secondary">{t('apiKeys.list.revokedBadge')}</Badge>
          )}
          {status === 'expired' && (
            <Badge variant="secondary">{t('apiKeys.list.expiredBadge')}</Badge>
          )}
        </div>
        <ApiKeyDetails
          apiKey={apiKey}
          status={status}
          creditLimit={creditLimit}
        />
      </ItemContent>
      {isActive && (
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
  status,
  creditLimit,
}: Readonly<{
  apiKey: ApiKey;
  status: ApiKeyStatus;
  creditLimit?: ApiKeyCreditLimit;
}>) {
  const { t } = useTranslation('admin-settings-api-keys');
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
        {getLifecycleText(apiKey, status, t)}
      </ItemDescription>
      {status === 'active' && (
        <ItemDescription data-testid="api-key-credit-usage">
          {creditText}
        </ItemDescription>
      )}
    </>
  );
}

function getLifecycleText(
  apiKey: ApiKey,
  status: ApiKeyStatus,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (status === 'revoked' && apiKey.revokedAt) {
    return t('apiKeys.list.revokedAt', { date: formatDate(apiKey.revokedAt) });
  }
  if (status === 'expired' && apiKey.expiresAt) {
    return t('apiKeys.list.expiredAt', { date: formatDate(apiKey.expiresAt) });
  }
  return apiKey.expiresAt
    ? t('apiKeys.list.expiresAt', { date: formatDate(apiKey.expiresAt) })
    : t('apiKeys.list.neverExpires');
}
