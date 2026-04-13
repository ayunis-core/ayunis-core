import { Button } from '@/shared/ui/shadcn/button';
import { useStartOAuthAuthorization } from '../api/useStartOAuthAuthorization';
import { useRevokeOAuthAuthorization } from '../api/useRevokeOAuthAuthorization';

export interface OAuthAuthorizeButtonMessages {
  authorize: string;
  authorizing: string;
  reauthorize: string;
  revoke: string;
  errorToast: string;
  errorClientNotConfigured: string;
  errorIntegrationNotFound: string;
  revokeSuccess: string;
  revokeError: string;
}

interface OAuthAuthorizeButtonProps {
  integrationId: string;
  isAuthorized: boolean;
  onAuthorized?: () => void;
  messages: OAuthAuthorizeButtonMessages;
}

export function OAuthAuthorizeButton({
  integrationId,
  isAuthorized,
  onAuthorized,
  messages,
}: Readonly<OAuthAuthorizeButtonProps>) {
  const startMutation = useStartOAuthAuthorization({
    errorToast: messages.errorToast,
    errorClientNotConfigured: messages.errorClientNotConfigured,
    errorIntegrationNotFound: messages.errorIntegrationNotFound,
  });
  const revokeMutation = useRevokeOAuthAuthorization({
    revokeSuccess: messages.revokeSuccess,
    revokeError: messages.revokeError,
    errorIntegrationNotFound: messages.errorIntegrationNotFound,
  });

  const isBusy = startMutation.isPending || revokeMutation.isPending;
  let buttonLabel = messages.authorize;
  if (startMutation.isPending) {
    buttonLabel = messages.authorizing;
  } else if (isAuthorized) {
    buttonLabel = messages.reauthorize;
  }

  const handleAuthorize = () => {
    onAuthorized?.();
    startMutation.mutate({ integrationId });
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
        {buttonLabel}
      </Button>
      {isAuthorized && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRevoke}
          disabled={isBusy}
        >
          {messages.revoke}
        </Button>
      )}
    </div>
  );
}
