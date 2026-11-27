import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { MeResponseDto } from '@ayunis/api-client/schemas';
import {
  OfficeAddinSessionExpiredError,
  type OfficeAddinSession,
} from './session';
import type {
  OfficeSignInOptions,
  OfficeSignInResult,
  OpenOfficeSignInDialog,
} from './sign-in-dialog';

export type OfficeAddinPaneError =
  'signInFailed' | 'sessionExpired' | 'unreachable' | 'hostRequired';

export type OfficeAddinAuthState =
  | { status: 'loading' }
  | {
      status: 'signedOut';
      error?: OfficeAddinPaneError;
      dialogClosed?: boolean;
    }
  | { status: 'signingIn' }
  | { status: 'signedIn'; user: MeResponseDto };

type SetAuthState = Dispatch<SetStateAction<OfficeAddinAuthState>>;

export function useOfficeAddinAuth(
  session: OfficeAddinSession,
  officeAvailable: () => Promise<boolean>,
  openSignInDialog: OpenOfficeSignInDialog,
) {
  const [state, setState] = useState<OfficeAddinAuthState>({
    status: 'loading',
  });
  const closeDialog = useRef<(() => void) | null>(null);
  useDialogCleanup(closeDialog);
  useSessionEnd(session, setState);
  useSessionRestore(session, setState);
  const signIn = useSignIn(
    session,
    officeAvailable,
    openSignInDialog,
    closeDialog,
    setState,
  );
  const signOut = useCallback(async () => {
    try {
      await session.signOut();
    } finally {
      setState({ status: 'signedOut' });
    }
  }, [session]);
  const expire = useCallback(
    () => setState({ status: 'signedOut', error: 'sessionExpired' }),
    [],
  );
  return { state, signIn, signOut, expire };
}

function useDialogCleanup(closeDialog: RefObject<(() => void) | null>): void {
  useEffect(() => () => closeDialog.current?.(), [closeDialog]);
}

function useSessionEnd(
  session: OfficeAddinSession,
  setState: SetAuthState,
): void {
  useEffect(
    () =>
      session.onEnd((reason) =>
        setState(
          reason === 'expired'
            ? { status: 'signedOut', error: 'sessionExpired' }
            : { status: 'signedOut' },
        ),
      ),
    [session, setState],
  );
}

function useSessionRestore(
  session: OfficeAddinSession,
  setState: SetAuthState,
): void {
  const restored = useRef(false);
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
  }, [session, setState]);
}

function useSignIn(
  session: OfficeAddinSession,
  officeAvailable: () => Promise<boolean>,
  openSignInDialog: OpenOfficeSignInDialog,
  closeDialog: RefObject<(() => void) | null>,
  setState: SetAuthState,
): (options?: OfficeSignInOptions) => void {
  const handleResult = useDialogResult(session, closeDialog, setState);
  return useCallback(
    (options?: OfficeSignInOptions) => {
      closeDialog.current?.();
      closeDialog.current = null;
      setState({ status: 'signingIn' });
      officeAvailable()
        .then((available) => {
          if (!available) {
            setState({ status: 'signedOut', error: 'hostRequired' });
            return;
          }
          closeDialog.current = openSignInDialog(handleResult, options);
        })
        .catch(() => setState({ status: 'signedOut', error: 'hostRequired' }));
    },
    [closeDialog, handleResult, officeAvailable, openSignInDialog, setState],
  );
}

function useDialogResult(
  session: OfficeAddinSession,
  closeDialog: RefObject<(() => void) | null>,
  setState: SetAuthState,
): (result: OfficeSignInResult) => void {
  return useCallback(
    (result: OfficeSignInResult) => {
      handleDialogResult(result, session, closeDialog, setState).catch(() =>
        setState({ status: 'signedOut', error: 'signInFailed' }),
      );
    },
    [closeDialog, session, setState],
  );
}

async function handleDialogResult(
  result: OfficeSignInResult,
  session: OfficeAddinSession,
  closeDialog: RefObject<(() => void) | null>,
  setState: SetAuthState,
): Promise<void> {
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

function toPaneError(error: unknown): OfficeAddinPaneError {
  return error instanceof OfficeAddinSessionExpiredError
    ? 'sessionExpired'
    : 'unreachable';
}
