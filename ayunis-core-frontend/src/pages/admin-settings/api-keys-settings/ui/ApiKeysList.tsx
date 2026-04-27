import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
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
      {apiKeys.map((apiKey) => (
        <Item key={apiKey.id} variant="outline">
          <ItemContent>
            <ItemTitle>{apiKey.name}</ItemTitle>
            <ItemDescription>
              <span className="font-mono">{apiKey.prefixPreview}</span>
              {' · '}
              {t('apiKeys.list.createdAt', {
                date: formatDate(apiKey.createdAt),
              })}
              {' · '}
              {apiKey.expiresAt
                ? t('apiKeys.list.expiresAt', {
                    date: formatDate(apiKey.expiresAt),
                  })
                : t('apiKeys.list.neverExpires')}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => revokeApiKey(apiKey.id, apiKey.name)}
              disabled={isRevoking}
              aria-label={t('apiKeys.revokeApiKey.ariaLabel', {
                name: apiKey.name,
              })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </ItemActions>
        </Item>
      ))}
    </div>
  );
}
