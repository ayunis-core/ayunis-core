import { useCallback, useEffect, useRef, useState } from 'react';
import type { MeResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  SessionExpiredError,
  type PaneSession,
} from '@/outlook/api/pane-session';
import {
  openSignInDialog,
  type SignInOptions,
  type SignInResult,
} from '@/outlook/lib/sign-in-dialog';

export type PaneError =
  'signInFailed' | 'sessionExpired' | 'unreachable' | 'outlookRequired';

export type PaneAuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; error?: PaneError; dialogClosed?: boolean }
  | { status: 'signingIn' }
  | { status: 'signedIn'; user: MeResponseDto };

function toPaneError(error: unknown): PaneError {
  return error instanceof SessionExpiredError
    ? 'sessionExpired'
    : 'unreachable';
}

// `officeAvailable` is asked on every sign-in: on a cold desktop start
// Office.js is often not ready when the pane loads, and a verdict taken
// then would refuse every later attempt.
export function usePaneAuth(
  session: PaneSession,
  officeAvailable: () => Promise<boolean>,
) {
  const [state, setState] = useState<PaneAuthState>({ status: 'loading' });
  const restored = useRef(false);
  const closeDialog = useRef<(() => void) | null>(null);

  useEffect(() => () => closeDialog.current?.(), []);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    session
      .restore()
      .then((user) =>
        setState(user ? { status: 'signedIn', user } : { status: 'signedOut' }),
      )
      .catch((error: unknown) =>
        setState({ status: 'signedOut', error: toPaneError(error) }),
      );
  }, [session]);

  function signIn(options?: SignInOptions): void {
    closeDialog.current?.();
    closeDialog.current = null;
    setState({ status: 'signingIn' });
    officeAvailable()
      .then((available) => {
        if (!available) {
          setState({ status: 'signedOut', error: 'outlookRequired' });
          return;
        }
        closeDialog.current = openSignInDialog(
          handleDialogResultSafely,
          options,
        );
      })
      // Whatever fails before the dialog opened, the button must come back.
      .catch(() => setState({ status: 'signedOut', error: 'outlookRequired' }));
  }

  // After `closed` the dialog keeps listening: an SSO round trip may still
  // deliver the session. A new sign-in replaces that dialog.
  async function handleDialogResult(result: SignInResult): Promise<void> {
    if (result.type === 'closed') {
      setState({ status: 'signedOut', dialogClosed: true });
      return;
    }
    closeDialog.current?.();
    closeDialog.current = null;
    if (result.type === 'error') {
      setState({ status: 'signedOut', error: 'signInFailed' });
      return;
    }
    try {
      setState({ status: 'signedIn', user: await session.signIn(result) });
    } catch {
      setState({ status: 'signedOut', error: 'signInFailed' });
    }
  }

  // Whatever fails while a result is handled, the pane must not stay on
  // "Signing in" with its button disabled.
  function handleDialogResultSafely(result: SignInResult): void {
    handleDialogResult(result).catch(() =>
      setState({ status: 'signedOut', error: 'signInFailed' }),
    );
  }

  async function signOut(): Promise<void> {
    try {
      await session.signOut();
    } finally {
      setState({ status: 'signedOut' });
    }
  }

  // The chat reports a session the backend no longer accepts; the stored
  // tokens are already gone by then.
  const expire = useCallback(
    () => setState({ status: 'signedOut', error: 'sessionExpired' }),
    [],
  );

  return { state, signIn, signOut, expire };
}
