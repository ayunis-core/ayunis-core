import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import { Badge } from '@/shared/ui/shadcn/badge';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { formatDate } from '@/shared/lib/format-date';
import { ApiKeysEmptyState } from './ApiKeysEmptyState';
import { useRevokeApiKey } from '../api/useRevokeApiKey';
import type { ApiKey } from '../model/types';

interface ApiKeysListProps {
  apiKeys: ApiKey[];
}

export function ApiKeysList({ apiKeys }: Readonly<ApiKeysListProps>) {
  const { t } = useTranslation('admin-settings-api-keys');
  const { revokeApiKey, isRevoking } = useRevokeApiKey();

  if (apiKeys.length === 0) {
    return <ApiKeysEmptyState />;
  }

  return (
    <div className="space-y-3">
      {apiKeys.map((apiKey) => {
        const isRevoked = apiKey.revokedAt !== null;
        let lifecycleText: string;
        if (isRevoked) {
          lifecycleText = t('apiKeys.list.revokedAt', {
            date: formatDate(apiKey.revokedAt as unknown as string),
          });
        } else if (apiKey.expiresAt) {
          lifecycleText = t('apiKeys.list.expiresAt', {
            date: formatDate(apiKey.expiresAt),
          });
        } else {
          lifecycleText = t('apiKeys.list.neverExpires');
        }
        return (
          <Item key={apiKey.id} variant="outline">
            <ItemContent>
              <div className="flex items-center gap-2">
                <ItemTitle>{apiKey.name}</ItemTitle>
                {isRevoked && (
                  <Badge variant="secondary">
                    {t('apiKeys.list.revokedBadge')}
                  </Badge>
                )}
              </div>
              <ItemDescription>
                <span className="font-mono">{apiKey.prefixPreview}</span>
                {' · '}
                {t('apiKeys.list.createdAt', {
                  date: formatDate(apiKey.createdAt),
                })}
                {' · '}
                {lifecycleText}
              </ItemDescription>
            </ItemContent>
            {!isRevoked && (
              <ItemActions>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => revokeApiKey(apiKey.id, apiKey.name)}
                  disabled={isRevoking(apiKey.id)}
                  aria-label={t('apiKeys.revokeApiKey.ariaLabel', {
                    name: apiKey.name,
                  })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </ItemActions>
            )}
          </Item>
        );
      })}
    </div>
  );
}
