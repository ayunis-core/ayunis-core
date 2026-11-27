import type { SessionHandoffRequestDtoClient } from '@ayunis/api-client/schemas';
import {
  parseOfficeDialogMessage,
  type OfficeDialogMessage,
} from './dialog-message';

export type OfficeSignInResult = OfficeDialogMessage | { type: 'closed' };
export type OfficeSignInOptions = { promptLogin?: boolean };
export type OpenOfficeSignInDialog = (
  onResult: (result: OfficeSignInResult) => void,
  options?: OfficeSignInOptions,
) => () => void;

export type OfficeSignInDialogConfig = {
  client: SessionHandoffRequestDtoClient;
  loginPath: string;
};

type DialogState = {
  dialog?: Office.Dialog;
  open: boolean;
  closed: boolean;
};

const DIALOG_CLOSED = 12006;

export function createOfficeSignInDialog(
  config: OfficeSignInDialogConfig,
): OpenOfficeSignInDialog {
  return (onResult, options = {}) => {
    const state: DialogState = { open: true, closed: false };
    const report = (result: OfficeSignInResult) => {
      if (state.open) onResult(result);
    };
    Office.context.ui.displayDialogAsync(
      signInUrl(config, options),
      { height: 70, width: 40, displayInIframe: false },
      (result) => attachDialog(result, state, report),
    );
    return () => {
      state.open = false;
      closeDialog(state);
    };
  };
}

function signInUrl(
  config: OfficeSignInDialogConfig,
  options: OfficeSignInOptions,
): string {
  const url = new URL(config.loginPath, window.location.origin);
  url.searchParams.set('client', config.client);
  if (options.promptLogin) url.searchParams.set('prompt', 'login');
  return url.toString();
}

function attachDialog(
  result: Office.AsyncResult<Office.Dialog>,
  state: DialogState,
  report: (result: OfficeSignInResult) => void,
): void {
  if (result.status === Office.AsyncResultStatus.Failed) {
    report({ type: 'error', code: `DIALOG_${result.error.code}` });
    return;
  }
  state.dialog = result.value;
  if (!state.open) {
    closeDialog(state);
    return;
  }
  result.value.addEventHandler(
    Office.EventType.DialogMessageReceived,
    (arg) => {
      closeDialog(state);
      report(toOfficeSignInResult(arg));
      state.open = false;
    },
  );
  result.value.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
    const code = 'error' in arg ? arg.error : DIALOG_CLOSED;
    report(
      code === DIALOG_CLOSED
        ? { type: 'closed' }
        : { type: 'error', code: `DIALOG_${code}` },
    );
  });
}

function closeDialog(state: DialogState): void {
  if (state.closed || !state.dialog) return;
  state.closed = true;
  try {
    state.dialog.close();
  } catch {
    // Office already closed the dialog.
  }
}

function toOfficeSignInResult(
  arg: { message: string; origin: string | undefined } | { error: number },
): OfficeSignInResult {
  if ('error' in arg) {
    return { type: 'error', code: `DIALOG_${arg.error}` };
  }
  if (arg.origin !== undefined && arg.origin !== window.location.origin) {
    return { type: 'error', code: 'UNEXPECTED_ORIGIN' };
  }
  return (
    parseOfficeDialogMessage(arg.message) ?? {
      type: 'error',
      code: 'INVALID_MESSAGE',
    }
  );
}
