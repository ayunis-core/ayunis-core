import { sessionHandoffControllerHandoff } from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import {
  OUTLOOK_CLIENT,
  type DialogMessage,
} from '@/outlook/model/dialog-message';
import { createOutlookI18n } from '@/outlook/lib/i18n';
import {
  officeDisplayLanguage,
  officeReady,
  officeUi,
} from '@/outlook/lib/office-ready';

// Last page of the sign-in dialog. The login pages run unchanged before it
// and leave session cookies behind; this page gets the pane its own session
// from them and sends it to the pane through messageParent.
async function handOver(): Promise<void> {
  const status = document.getElementById('status');
  const ready = await officeReady().then(
    () => true,
    () => false,
  );
  const i18n = createOutlookI18n(officeDisplayLanguage());
  const ui = officeUi();
  // Without a pane to receive them the tokens would be an orphaned session.
  // This also happens when SSO cut the dialog off from the pane; the cookie
  // session survives, so the next sign-in dialog hands it over at once.
  if (!ready || typeof ui?.messageParent !== 'function') {
    if (status) status.textContent = i18n.t('dialog.outlookRequired');
    return;
  }
  if (status) status.textContent = i18n.t('dialog.connecting');
  ui.messageParent(JSON.stringify(await handoff()));
}

async function handoff(): Promise<DialogMessage> {
  const client = new URLSearchParams(window.location.search).get('client');
  if (client !== OUTLOOK_CLIENT) {
    return { type: 'error', code: 'UNKNOWN_CLIENT' };
  }
  try {
    const tokens = await sessionHandoffControllerHandoff({ client });
    return { type: 'session', ...tokens };
  } catch (error) {
    return { type: 'error', code: errorCode(error) };
  }
}

function errorCode(error: unknown): string {
  try {
    return extractErrorData(error).code;
  } catch {
    return 'NETWORK_ERROR';
  }
}

void handOver();
