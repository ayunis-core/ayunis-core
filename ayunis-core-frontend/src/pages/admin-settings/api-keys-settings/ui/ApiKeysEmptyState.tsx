import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';

export function ApiKeysEmptyState() {
  const { t } = useTranslation('admin-settings-api-keys');

  return (
    <EmptyState
      title={t('apiKeys.list.emptyTitle')}
      description={t('apiKeys.list.emptyDescription')}
    />
  );
}
