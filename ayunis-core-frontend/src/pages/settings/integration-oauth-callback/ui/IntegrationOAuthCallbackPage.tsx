import { Link } from '@tanstack/react-router';
import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import type { CompleteMcpOAuthDto } from '@/shared/api';
import { Button } from '@/shared/ui/shadcn/button';
import { useCompleteMcpOAuth } from '../api/useCompleteMcpOAuth';
import {
  resolveOAuthCallbackCopy,
  type OAuthCallbackStatus,
} from '../lib/resolve-callback-copy';

function resolveCallbackStatus(status: {
  isSuccess: boolean;
  isError: boolean;
}): OAuthCallbackStatus {
  if (status.isSuccess) return 'success';
  if (status.isError) return 'error';
  return 'pending';
}

export default function IntegrationOAuthCallbackPage(
  props: Readonly<CompleteMcpOAuthDto>,
) {
  const { t } = useTranslation('settings');
  const status = useCompleteMcpOAuth(props);
  const callbackStatus = resolveCallbackStatus(status);
  const copy = resolveOAuthCallbackCopy(callbackStatus);

  return (
    <AppLayout>
      <FullScreenMessageLayout>
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          {status.isPending && (
            <LoaderCircle className="h-10 w-10 animate-spin text-muted-foreground" />
          )}
          {status.isSuccess && (
            <CheckCircle2 className="h-10 w-10 text-primary" />
          )}
          {status.isError && (
            <AlertCircle className="h-10 w-10 text-destructive" />
          )}
          <h1 className="text-xl font-semibold">{t(copy.title)}</h1>
          <p className="text-muted-foreground">{t(copy.description)}</p>
          {!status.isPending && (
            <Button asChild>
              <Link to="/settings/integrations">
                {t('integrations.oauth.callback.back')}
              </Link>
            </Button>
          )}
        </div>
      </FullScreenMessageLayout>
    </AppLayout>
  );
}
