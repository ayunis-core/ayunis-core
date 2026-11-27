import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionHandoffRequestDtoClient } from '@ayunis/api-client/schemas';
import {
  createOfficeSignInDialog,
  type OfficeSignInResult,
} from './sign-in-dialog';

type Handler = (arg: unknown) => void;

const client = Object.values(SessionHandoffRequestDtoClient)[0];
const session = {
  type: 'session',
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresIn: 3600,
} as const;

function stubOffice(close: () => void) {
  const handlers: Record<string, Handler> = {};
  const dialog = {
    addEventHandler: (type: string, handler: Handler) => {
      handlers[type] = handler;
    },
    close,
  };
  vi.stubGlobal('Office', {
    AsyncResultStatus: { Succeeded: 'succeeded', Failed: 'failed' },
    EventType: {
      DialogMessageReceived: 'dialogMessageReceived',
      DialogEventReceived: 'dialogEventReceived',
    },
    context: {
      ui: {
        displayDialogAsync: (
          _url: string,
          _options: unknown,
          callback: (result: { status: string; value: typeof dialog }) => void,
        ) => callback({ status: 'succeeded', value: dialog }),
      },
    },
  });
  return handlers;
}

describe('createOfficeSignInDialog', () => {
  const close = vi.fn();
  const openSignInDialog = createOfficeSignInDialog({
    client,
    loginPath: '/host/login',
  });

  beforeEach(() => close.mockReset());
  afterEach(() => vi.unstubAllGlobals());

  it('reports the session even when closing an already closed dialog throws', () => {
    let closeCalls = 0;
    const closeOnce = () => {
      closeCalls += 1;
      if (closeCalls > 1) throw new Error('Dialog already closed');
    };
    const handlers = stubOffice(closeOnce);
    const results: OfficeSignInResult[] = [];
    const stop = openSignInDialog((result) => results.push(result));

    expect(() =>
      handlers.dialogMessageReceived({
        message: JSON.stringify(session),
        origin: window.location.origin,
      }),
    ).not.toThrow();
    expect(() => stop()).not.toThrow();

    expect(results).toEqual([session]);
    expect(closeCalls).toBe(1);
  });

  it('asks the login page for a fresh login when switching account', () => {
    const displayDialogAsync = vi.fn();
    vi.stubGlobal('Office', {
      AsyncResultStatus: { Succeeded: 'succeeded', Failed: 'failed' },
      EventType: {
        DialogMessageReceived: 'dialogMessageReceived',
        DialogEventReceived: 'dialogEventReceived',
      },
      context: { ui: { displayDialogAsync } },
    });

    openSignInDialog(() => undefined, { promptLogin: true });
    openSignInDialog(() => undefined);

    const [switching, plain] = displayDialogAsync.mock.calls.map(([url]) =>
      new URL(url as string).searchParams.get('prompt'),
    );
    expect(switching).toBe('login');
    expect(plain).toBeNull();
  });

  it('rejects a message from a different origin', () => {
    const handlers = stubOffice(close);
    const results: OfficeSignInResult[] = [];
    openSignInDialog((result) => results.push(result));

    handlers.dialogMessageReceived({
      message: JSON.stringify(session),
      origin: 'https://attacker.example',
    });

    expect(results).toEqual([{ type: 'error', code: 'UNEXPECTED_ORIGIN' }]);
  });
});
