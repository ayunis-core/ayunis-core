import type { BrowserContext, Page } from '@playwright/test';

const OFFICE_JS_URL =
  'https://officeapis.public.onecdn.static.microsoft/1/office.js';

export interface DialogTokens {
  type: 'session';
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface OfficeStubAddress {
  displayName: string;
  emailAddress: string;
}

/** A mail being composed, the item the pane's tools read and write. */
export interface OfficeStubComposeItem {
  subject: string;
  body: string;
  from: OfficeStubAddress;
  to: OfficeStubAddress[];
}

export interface OfficeStubCall {
  method: string;
  args: unknown[];
}

export interface OfficeStubState {
  messages: string[];
  calls: OfficeStubCall[];
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
// Given a compose item, the mailbox serves it and records every call the
// add-in makes on it.
const officeStub = (item: OfficeStubComposeItem | null) => `(() => {
  const state = { messages: [], calls: [], dialog: null };
  window.__officeStub = state;
  const mail = ${JSON.stringify(item)};
  const succeed = (callback, value) =>
    callback({ status: 'succeeded', value });
  const recorded = (method, run) => (...args) => {
    state.calls.push({ method, args: args.slice(0, -1) });
    run(...args);
  };
  const getter = (method, value) => ({
    getAsync: recorded(method, (callback) => succeed(callback, value())),
  });
  const composeItem = mail && {
    subject: {
      ...getter('subject.getAsync', () => mail.subject),
      setAsync: recorded('subject.setAsync', (subject, callback) => {
        mail.subject = subject;
        succeed(callback);
      }),
    },
    from: getter('from.getAsync', () => mail.from),
    to: getter('to.getAsync', () => mail.to),
    cc: getter('cc.getAsync', () => []),
    body: {
      getAsync: recorded('body.getAsync', (_coercion, callback) =>
        succeed(callback, mail.body),
      ),
      setAsync: recorded('body.setAsync', (text, _options, callback) => {
        mail.body = text;
        succeed(callback);
      }),
      setSelectedDataAsync: recorded(
        'body.setSelectedDataAsync',
        (text, _options, callback) => {
          mail.body += text;
          succeed(callback);
        },
      ),
    },
    getAttachmentsAsync: recorded('getAttachmentsAsync', (callback) =>
      succeed(callback, []),
    ),
    saveAsync: recorded('saveAsync', (callback) =>
      succeed(callback, 'e2e-item-id'),
    ),
  };
  window.Office = {
    AsyncResultStatus: { Succeeded: 'succeeded', Failed: 'failed' },
    CoercionType: { Text: 'text', Html: 'html' },
    EventType: {
      DialogMessageReceived: 'dialogMessageReceived',
      DialogEventReceived: 'dialogEventReceived',
    },
    MailboxEnums: {
      AttachmentContentFormat: {
        Base64: 'base64',
        Url: 'url',
        Eml: 'eml',
        ICalendar: 'iCalendar',
      },
    },
    onReady: () => Promise.resolve({ host: 'Outlook', platform: 'OfficeOnline' }),
    context: {
      displayLanguage: 'en-US',
      requirements: {
        isSetSupported: (name, version) =>
          name === 'Mailbox' && Number(version.split('.')[1] ?? 0) <= 8,
      },
      mailbox: { item: composeItem ?? undefined },
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
  options: { composeItem?: OfficeStubComposeItem } = {},
): Promise<void> {
  const body = officeStub(options.composeItem ?? null);
  await target.route(OFFICE_JS_URL, (route) =>
    route.fulfill({ contentType: 'application/javascript', body }),
  );
}
