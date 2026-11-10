import {
  OUTLOOK_CLIENT,
  parseDialogMessage,
  type DialogMessage,
} from '@/outlook/model/dialog-message';

export type SignInResult = DialogMessage | { type: 'closed' };

// 12006 means the user closed the dialog, but Office also reports it when an
// off-origin page (an identity provider during SSO) cuts the dialog off from
// the pane. A message may still follow, so `closed` is not final.
const DIALOG_CLOSED = 12006;

/**
 * Runs the regular login (password, SSO, MFA) in an Office dialog on our own
 * origin. Identity providers refuse to be framed, so `displayInIframe` stays
 * off; the dialog ends on /outlook/dialog.html, which hands the session over.
 * Results arrive through `onResult` until the returned function closes the
 * dialog and stops listening.
 */
export function openSignInDialog(
  onResult: (result: SignInResult) => void,
): () => void {
  const url = new URL('/outlook/login', window.location.origin);
  url.searchParams.set('client', OUTLOOK_CLIENT);
  let dialog: Office.Dialog | undefined;
  let open = true;
  let closed = false;
  const report = (result: SignInResult) => {
    if (open) onResult(result);
  };
  // Office closes the window on the first call; a second close of the same
  // dialog throws on Outlook on the web and must not swallow the result.
  const close = () => {
    if (closed || !dialog) return;
    closed = true;
    try {
      dialog.close();
    } catch {
      // already gone
    }
  };

  Office.context.ui.displayDialogAsync(
    url.toString(),
    { height: 70, width: 40, displayInIframe: false },
    (result) => {
      if (result.status === Office.AsyncResultStatus.Failed) {
        report({ type: 'error', code: `DIALOG_${result.error.code}` });
        return;
      }
      dialog = result.value;
      if (!open) {
        close();
        return;
      }
      dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        close();
        report(toSignInResult(arg));
        open = false;
      });
      dialog.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
        const code = 'error' in arg ? arg.error : DIALOG_CLOSED;
        report(
          code === DIALOG_CLOSED
            ? { type: 'closed' }
            : { type: 'error', code: `DIALOG_${code}` },
        );
      });
    },
  );

  return () => {
    open = false;
    close();
  };
}

function toSignInResult(
  arg: { message: string; origin: string | undefined } | { error: number },
): SignInResult {
  if ('error' in arg) {
    return { type: 'error', code: `DIALOG_${arg.error}` };
  }
  // `origin` needs DialogOrigin 1.1; older clients leave it undefined and
  // only deliver messages from our own domain anyway.
  if (arg.origin !== undefined && arg.origin !== window.location.origin) {
    return { type: 'error', code: 'UNEXPECTED_ORIGIN' };
  }
  return (
    parseDialogMessage(arg.message) ?? {
      type: 'error',
      code: 'INVALID_MESSAGE',
    }
  );
}
