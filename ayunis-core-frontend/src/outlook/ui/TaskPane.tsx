import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import brandFullLight from '@/shared/assets/brand/brand-full-light.svg';
import { createPaneChatApi } from '@/outlook/api/pane-chat-api';
import type { PaneSession } from '@/outlook/api/pane-session';
import type { SignInOptions } from '@/outlook/lib/sign-in-dialog';
import { usePaneAuth, type PaneError } from '@/outlook/lib/use-pane-auth';
import { PaneChat } from '@/outlook/ui/PaneChat';

export function TaskPane({
  session,
  officeAvailable,
}: Readonly<{
  session: PaneSession;
  officeAvailable: () => Promise<boolean>;
}>) {
  const { t } = useTranslation();
  const { state, signIn, signOut, expire } = usePaneAuth(
    session,
    officeAvailable,
  );
  const chatApi = useMemo(() => createPaneChatApi(session), [session]);

  if (state.status === 'signedIn') {
    return (
      <PaneChat
        api={chatApi}
        user={state.user}
        onSignOut={() => void signOut()}
        onSessionExpired={expire}
      />
    );
  }

  return (
    <main className="flex min-h-full flex-col items-center gap-6 px-6 py-10 text-center">
      <img src={brandFullLight} alt="Ayunis" className="h-9" />
      {state.status === 'loading' && (
        <p className="text-sm text-muted-foreground">{t('pane.loading')}</p>
      )}
      {(state.status === 'signedOut' || state.status === 'signingIn') && (
        <SignedOut
          signingIn={state.status === 'signingIn'}
          error={state.status === 'signedOut' ? state.error : undefined}
          dialogClosed={state.status === 'signedOut' && state.dialogClosed}
          onSignIn={signIn}
        />
      )}
    </main>
  );
}

function SignedOut({
  signingIn,
  error,
  dialogClosed,
  onSignIn,
}: Readonly<{
  signingIn: boolean;
  error?: PaneError;
  dialogClosed?: boolean;
  onSignIn: (options?: SignInOptions) => void;
}>) {
  const { t } = useTranslation();
  return (
    <div
      className="flex max-w-xs flex-col items-center gap-4"
      data-testid="outlook-pane-signed-out"
    >
      <p className="text-sm text-muted-foreground">{t('pane.description')}</p>
      {error && (
        <p
          className="text-sm text-destructive"
          role="alert"
          data-testid="outlook-pane-error"
        >
          {t(`pane.error.${error}`)}
        </p>
      )}
      {dialogClosed && (
        <p
          className="text-sm text-muted-foreground"
          data-testid="outlook-pane-dialog-closed"
        >
          {t('pane.dialogClosed')}
        </p>
      )}
      <Button
        className="w-full"
        disabled={signingIn}
        onClick={() => onSignIn()}
        data-testid="outlook-pane-sign-in"
      >
        {signingIn ? t('pane.signingIn') : t('pane.signIn')}
      </Button>
      <Button
        variant="link"
        size="sm"
        disabled={signingIn}
        onClick={() => onSignIn({ promptLogin: true })}
        data-testid="outlook-pane-switch-account"
      >
        {t('pane.switchAccount')}
      </Button>
    </div>
  );
}
