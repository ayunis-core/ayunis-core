import type { ReactNode } from 'react';
import type { MeResponseDto } from '@ayunis/api-client/schemas';
import { Button } from '@ayunis/ui/components/button';
import { useOfficeAddinAuth, type OfficeAddinPaneError } from './auth';
import type { OfficeAddinSession } from './session';
import type {
  OfficeSignInOptions,
  OpenOfficeSignInDialog,
} from './sign-in-dialog';

export type OfficeAddinAuthCopy = {
  loading: string;
  description: string;
  signIn: string;
  signingIn: string;
  switchAccount: string;
  dialogClosed: string;
  errors: Record<OfficeAddinPaneError, string>;
};

export function OfficeAddinAuthShell({
  session,
  officeAvailable,
  openSignInDialog,
  brandSrc,
  brandAlt,
  copy,
  testIdPrefix,
  children,
}: Readonly<{
  session: OfficeAddinSession;
  officeAvailable: () => Promise<boolean>;
  openSignInDialog: OpenOfficeSignInDialog;
  brandSrc: string;
  brandAlt: string;
  copy: OfficeAddinAuthCopy;
  testIdPrefix: string;
  children: (user: MeResponseDto) => ReactNode;
}>) {
  const { state, signIn } = useOfficeAddinAuth(
    session,
    officeAvailable,
    openSignInDialog,
  );
  if (state.status === 'signedIn') {
    return (
      <div className="h-full" data-testid={`${testIdPrefix}-signed-in`}>
        {children(state.user)}
      </div>
    );
  }
  return (
    <main className="flex min-h-full flex-col items-center gap-6 px-6 py-10 text-center">
      <img src={brandSrc} alt={brandAlt} className="h-9" />
      {state.status === 'loading' && (
        <p className="text-sm text-muted-foreground">{copy.loading}</p>
      )}
      {(state.status === 'signedOut' || state.status === 'signingIn') && (
        <SignedOut
          signingIn={state.status === 'signingIn'}
          error={state.status === 'signedOut' ? state.error : undefined}
          dialogClosed={state.status === 'signedOut' && state.dialogClosed}
          onSignIn={signIn}
          copy={copy}
          testIdPrefix={testIdPrefix}
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
  copy,
  testIdPrefix,
}: Readonly<{
  signingIn: boolean;
  error?: OfficeAddinPaneError;
  dialogClosed?: boolean;
  onSignIn: (options?: OfficeSignInOptions) => void;
  copy: OfficeAddinAuthCopy;
  testIdPrefix: string;
}>) {
  return (
    <div
      className="flex max-w-xs flex-col items-center gap-4"
      data-testid={`${testIdPrefix}-signed-out`}
    >
      <p className="text-sm text-muted-foreground">{copy.description}</p>
      <SignedOutStatus
        error={error}
        dialogClosed={dialogClosed}
        copy={copy}
        testIdPrefix={testIdPrefix}
      />
      <SignInActions
        signingIn={signingIn}
        onSignIn={onSignIn}
        copy={copy}
        testIdPrefix={testIdPrefix}
      />
    </div>
  );
}

function SignedOutStatus({
  error,
  dialogClosed,
  copy,
  testIdPrefix,
}: Readonly<{
  error?: OfficeAddinPaneError;
  dialogClosed?: boolean;
  copy: OfficeAddinAuthCopy;
  testIdPrefix: string;
}>) {
  return (
    <>
      {error && (
        <p
          className="text-sm text-destructive"
          role="alert"
          data-testid={`${testIdPrefix}-error`}
        >
          {copy.errors[error]}
        </p>
      )}
      {dialogClosed && (
        <p
          className="text-sm text-muted-foreground"
          data-testid={`${testIdPrefix}-dialog-closed`}
        >
          {copy.dialogClosed}
        </p>
      )}
    </>
  );
}

function SignInActions({
  signingIn,
  onSignIn,
  copy,
  testIdPrefix,
}: Readonly<{
  signingIn: boolean;
  onSignIn: (options?: OfficeSignInOptions) => void;
  copy: OfficeAddinAuthCopy;
  testIdPrefix: string;
}>) {
  return (
    <>
      <Button
        className="w-full"
        disabled={signingIn}
        onClick={() => onSignIn()}
        data-testid={`${testIdPrefix}-sign-in`}
      >
        {signingIn ? copy.signingIn : copy.signIn}
      </Button>
      <Button
        variant="link"
        size="sm"
        disabled={signingIn}
        onClick={() => onSignIn({ promptLogin: true })}
        data-testid={`${testIdPrefix}-switch-account`}
      >
        {copy.switchAccount}
      </Button>
    </>
  );
}
