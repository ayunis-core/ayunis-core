import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { ActiveSubscriptionResponseDtoSubscriptionType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { ActiveSubscriptionResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import SettingsLayout from '../../admin-settings-layout';
import { ApiKeysList } from './ApiKeysList';
import { CreateApiKeyDialog } from './CreateApiKeyDialog';
import { RevealSecretDialog } from './RevealSecretDialog';
import type { ApiKey } from '../model/types';

interface ApiKeysSettingsPageProps {
  apiKeys: ApiKey[];
  subscription: ActiveSubscriptionResponseDto;
}

export function ApiKeysSettingsPage({
  apiKeys,
  subscription,
}: Readonly<ApiKeysSettingsPageProps>) {
  const { t } = useTranslation('admin-settings-api-keys');
  const { t: tLayout } = useTranslation('admin-settings-layout');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const requiresUsageBasedUpgrade =
    subscription.subscriptionType ===
    ActiveSubscriptionResponseDtoSubscriptionType.SEAT_BASED;

  const headerActions = (
    <div className="flex gap-2">
      <HelpLink path="settings/admin/api-keys/" />
      <Button
        size="sm"
        onClick={() => setCreateDialogOpen(true)}
        disabled={requiresUsageBasedUpgrade}
      >
        {t('apiKeys.page.add')}
      </Button>
    </div>
  );

  return (
    <SettingsLayout action={headerActions} title={tLayout('layout.apiKeys')}>
      <div className="space-y-4">
        {requiresUsageBasedUpgrade && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t('apiKeys.createApiKey.subscriptionRequired')}
            </AlertDescription>
          </Alert>
        )}

        <ApiKeysList apiKeys={apiKeys} />

        <CreateApiKeyDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onCreated={(response) => setRevealedSecret(response.secret)}
        />

        <RevealSecretDialog
          open={revealedSecret !== null}
          onOpenChange={(next) => {
            if (!next) setRevealedSecret(null);
          }}
          secret={revealedSecret}
        />
      </div>
    </SettingsLayout>
  );
}
