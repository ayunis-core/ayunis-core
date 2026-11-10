import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import brandFullLight from '@/shared/assets/brand/brand-full-light.svg';
import type { PaneSession } from '@/outlook/api/pane-session';
import { usePaneAuth, type PaneError } from '@/outlook/lib/use-pane-auth';

export function TaskPane({
  session,
  officeAvailable,
}: Readonly<{ session: PaneSession; officeAvailable: boolean }>) {
  const { t } = useTranslation();
  const { state, signIn, signOut } = usePaneAuth(session, officeAvailable);

  return (
    <main className="flex min-h-full flex-col items-center gap-6 px-6 py-10 text-center">
      <img src={brandFullLight} alt="Ayunis" className="h-9" />
      {state.status === 'loading' && (
        <p className="text-sm text-muted-foreground">{t('pane.loading')}</p>
      )}
      {state.status === 'signedIn' && (
        <div
          className="flex flex-col items-center gap-4"
          data-testid="outlook-pane-signed-in"
        >
          <div className="flex flex-col gap-1">
            <p className="font-medium" data-testid="outlook-pane-user-name">
              {state.user.name}
            </p>
            <p className="text-sm text-muted-foreground">{state.user.email}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => void signOut()}
            data-testid="outlook-pane-sign-out"
          >
            {t('pane.signOut')}
          </Button>
        </div>
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
  onSignIn: () => void;
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
        onClick={onSignIn}
        data-testid="outlook-pane-sign-in"
      >
        {signingIn ? t('pane.signingIn') : t('pane.signIn')}
      </Button>
    </div>
  );
}
