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
  inReplyTo?: string;
  subject: string;
  body: string;
  from: OfficeStubAddress;
  to: OfficeStubAddress[];
}

/** A received mail open in the reading pane, identified by its item id. */
export interface OfficeStubReadItem {
  internetMessageId?: string;
  itemId: string;
  subject: string;
  body: string;
  from: OfficeStubAddress;
}

export interface OfficeStubCall {
  method: string;
  args: unknown[];
}

export interface OfficeStubState {
  messages: string[];
  calls: OfficeStubCall[];
  /**
   * The launch-event handlers the page registered, once it has started the
   * Office.js handshake Outlook waits for before it dispatches an event.
   */
  launchEventHandlers(): string[];
  /** Dispatches a launch event; true if the handler completed it at once. */
  dispatchLaunchEvent(functionName: string): boolean;
  dialog: {
    url: string;
    closed: boolean;
    send(message: string): void;
    closeByUser(): void;
  } | null;
  /** Selects another item in a pinned pane, as Outlook does on a click. */
  selectItem(item: OfficeStubReadItem | null): void;
}

export type OfficeStubWindow = Window & { __officeStub: OfficeStubState };

// Playwright has no Outlook host, so office.js is replaced by the subset of
// the Office API the add-in pages call. messageParent records what the dialog
// would send; displayDialogAsync hands the test a handle to answer for it.
// Given a compose item, the mailbox serves it and records every call the
// add-in makes on it.
const officeStub = (
  item: OfficeStubComposeItem | null,
  readItem: OfficeStubReadItem | null,
) => `(() => {
  const mailboxHandlers = {};
  const state = { messages: [], calls: [], dialog: null };
  window.__officeStub = state;
  const mail = ${JSON.stringify(item)};
  let officeReadyRequested = false;
  const launchEventHandlers = {};
  state.launchEventHandlers = () =>
    officeReadyRequested ? Object.keys(launchEventHandlers) : [];
  state.dispatchLaunchEvent = (functionName) => {
    let completed = false;
    launchEventHandlers[functionName]({ completed: () => { completed = true; } });
    return completed;
  };
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
    inReplyTo: mail.inReplyTo,
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
      getTypeAsync: recorded('body.getTypeAsync', (callback) =>
        succeed(callback, 'html'),
      ),
      prependAsync: recorded('body.prependAsync', (text, _options, callback) => {
        mail.body = text + mail.body;
        succeed(callback);
      }),
    },
    getAttachmentsAsync: recorded('getAttachmentsAsync', (callback) =>
      succeed(callback, []),
    ),
    saveAsync: recorded('saveAsync', (callback) =>
      succeed(callback, 'e2e-item-id'),
    ),
  };
  const readItemFrom = (read) => read && {
    itemId: read.itemId,
    internetMessageId: read.internetMessageId,
    subject: read.subject,
    from: read.from,
    to: [],
    cc: [],
    attachments: [],
    body: {
      getAsync: recorded('body.getAsync', (_coercion, callback) =>
        succeed(callback, read.body),
      ),
    },
    displayReplyForm: (formData) => {
      state.calls.push({ method: 'displayReplyForm', args: [formData] });
    },
    displayReplyAllForm: (formData) => {
      state.calls.push({ method: 'displayReplyAllForm', args: [formData] });
    },
    displayReplyFormAsync: recorded('displayReplyFormAsync', (_data, callback) =>
      succeed(callback),
    ),
    displayReplyAllFormAsync: recorded(
      'displayReplyAllFormAsync',
      (_data, callback) => succeed(callback),
    ),
  };
  const mailbox = {
    item: readItemFrom(${JSON.stringify(readItem)}) ?? composeItem ?? undefined,
    addHandlerAsync: (type, handler, callback) => {
      mailboxHandlers[type] = handler;
      callback?.({ status: 'succeeded' });
    },
    removeHandlerAsync: (type, callback) => {
      delete mailboxHandlers[type];
      callback?.({ status: 'succeeded' });
    },
  };
  state.selectItem = (read) => {
    mailbox.item = readItemFrom(read) ?? undefined;
    mailboxHandlers.olkItemSelectedChanged?.({ type: 'olkItemSelectedChanged' });
  };
  window.Office = {
    AsyncResultStatus: { Succeeded: 'succeeded', Failed: 'failed' },
    CoercionType: { Text: 'text', Html: 'html' },
    EventType: {
      DialogMessageReceived: 'dialogMessageReceived',
      DialogEventReceived: 'dialogEventReceived',
      ItemChanged: 'olkItemSelectedChanged',
    },
    actions: {
      associate: (name, handler) => {
        launchEventHandlers[name] = handler;
      },
    },
    MailboxEnums: {
      AttachmentContentFormat: {
        Base64: 'base64',
        Url: 'url',
        Eml: 'eml',
        ICalendar: 'iCalendar',
      },
    },
    onReady: () => {
      officeReadyRequested = true;
      return Promise.resolve({ host: 'Outlook', platform: 'OfficeOnline' });
    },
    context: {
      displayLanguage: 'en-US',
      requirements: {
        isSetSupported: (name, version) =>
          name === 'Mailbox' && Number(version.split('.')[1] ?? 0) <= 14,
      },
      mailbox,
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
  options: {
    composeItem?: OfficeStubComposeItem;
    readItem?: OfficeStubReadItem;
  } = {},
): Promise<void> {
  const body = officeStub(
    options.composeItem ?? null,
    options.readItem ?? null,
  );
  await target.route(OFFICE_JS_URL, (route) =>
    route.fulfill({ contentType: 'application/javascript', body }),
  );
}
