import type { BrowserContext, Page } from '@playwright/test';

const OFFICE_JS_URL =
  'https://officeapis.public.onecdn.static.microsoft/1/office.js';

export interface DialogTokens {
  type: 'session';
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface OfficeStubState {
  messages: string[];
  dialog: {
    url: string;
    closed: boolean;
    send(message: string): void;
    closeByUser(): void;
  } | null;
}

export type OfficeStubWindow = Window & { __officeStub: OfficeStubState };

// Playwright has no Outlook host, so office.js is replaced by the subset of
// the Office API the add-in pages call. messageParent records what the dialog
// would send; displayDialogAsync hands the test a handle to answer for it.
const OFFICE_STUB = `(() => {
  const state = { messages: [], dialog: null };
  window.__officeStub = state;
  window.Office = {
    AsyncResultStatus: { Succeeded: 'succeeded', Failed: 'failed' },
    EventType: {
      DialogMessageReceived: 'dialogMessageReceived',
      DialogEventReceived: 'dialogEventReceived',
    },
    onReady: () => Promise.resolve({ host: 'Outlook', platform: 'OfficeOnline' }),
    context: {
      displayLanguage: 'en-US',
      ui: {
        messageParent: (message) => state.messages.push(message),
        displayDialogAsync: (url, _options, callback) => {
          const handlers = {};
          state.dialog = {
            url,
            closed: false,
            send: (message) =>
              handlers.dialogMessageReceived({ message, origin: location.origin }),
            closeByUser: () => handlers.dialogEventReceived({ error: 12006 }),
          };
          callback({
            status: 'succeeded',
            value: {
              addEventHandler: (type, handler) => { handlers[type] = handler; },
              close: () => { state.dialog.closed = true; },
            },
          });
        },
      },
    },
  };
})();`;

export async function stubOfficeHost(
  target: Page | BrowserContext,
): Promise<void> {
  await target.route(OFFICE_JS_URL, (route) =>
    route.fulfill({ contentType: 'application/javascript', body: OFFICE_STUB }),
  );
}
