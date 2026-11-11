import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';
import type { ServerUrlChange } from '@/pages/admin-settings/integrations-settings/lib/server-url-change';

export function ServerUrlChangeNotice({
  change,
}: Readonly<{ change: ServerUrlChange }>) {
  const { t } = useTranslation('admin-settings-integrations');
  if (!change.signsOutUsers) return null;
  return (
    <Alert variant="warning" data-testid="integration-server-url-change-notice">
      <AlertTriangle />
      <AlertTitle>{t('integrations.serverUrlChange.title')}</AlertTitle>
      <AlertDescription>
        {change.requiresNewOAuthClient
          ? t('integrations.serverUrlChange.staticClientDescription')
          : t('integrations.serverUrlChange.description')}
      </AlertDescription>
    </Alert>
  );
}
