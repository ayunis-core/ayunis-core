import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import SettingsLayout from '../../admin-settings-layout';
import { ApiKeysList } from './ApiKeysList';
import { CreateApiKeyDialog } from './CreateApiKeyDialog';
import { RevealSecretDialog } from './RevealSecretDialog';
import type { ApiKey } from '../model/types';

interface ApiKeysSettingsPageProps {
  apiKeys: ApiKey[];
}

export function ApiKeysSettingsPage({
  apiKeys,
}: Readonly<ApiKeysSettingsPageProps>) {
  const { t } = useTranslation('admin-settings-api-keys');
  const { t: tLayout } = useTranslation('admin-settings-layout');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const headerActions = (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
        {t('apiKeys.page.add')}
      </Button>
    </div>
  );

  return (
    <SettingsLayout action={headerActions} title={tLayout('layout.apiKeys')}>
      <div className="space-y-4">
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
