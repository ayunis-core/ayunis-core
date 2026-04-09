import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { useStartOAuthAuthorization } from '../api/useStartOAuthAuthorization';
import { useRevokeOAuthAuthorization } from '../api/useRevokeOAuthAuthorization';

interface OAuthAuthorizeButtonProps {
  integrationId: string;
  isAuthorized: boolean;
  onAuthorized?: () => void;
}

export function OAuthAuthorizeButton({
  integrationId,
  isAuthorized,
  onAuthorized,
}: Readonly<OAuthAuthorizeButtonProps>) {
  const { t } = useTranslation('admin-settings-integrations');
  const startMutation = useStartOAuthAuthorization();
  const revokeMutation = useRevokeOAuthAuthorization();

  const isBusy = startMutation.isPending || revokeMutation.isPending;

  const handleAuthorize = () => {
    onAuthorized?.();
    startMutation.mutate({ id: integrationId });
  };

  const handleRevoke = () => {
    revokeMutation.mutate({ id: integrationId });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleAuthorize}
        disabled={isBusy}
      >
        {isAuthorized
          ? t('integrations.oauth.reauthorize')
          : t('integrations.oauth.authorize')}
      </Button>
      {isAuthorized && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRevoke}
          disabled={isBusy}
        >
          {t('integrations.oauth.revoke')}
        </Button>
      )}
    </div>
  );
}
