import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  openSignInDialog,
  type SignInResult,
} from '@/outlook/lib/sign-in-dialog';

type Handler = (arg: unknown) => void;

const session = {
  type: 'session',
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresIn: 3600,
};

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

describe('openSignInDialog', () => {
  const close = vi.fn();

  beforeEach(() => {
    close.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  // Office closes the window on the first call; on Outlook on the web a second
  // close of the same dialog throws. The pane closes once on receipt and once
  // more while handling the result, so the result must still get through.
  it('reports the session even when closing an already closed dialog throws', () => {
    close
      .mockImplementationOnce(() => undefined)
      .mockImplementation(() => {
        throw new Error('Dialog already closed');
      });
    const handlers = stubOffice(close);
    const results: SignInResult[] = [];
    let stop: (() => void) | undefined;
    // eslint-disable-next-line prefer-const -- assigned after the callback that uses it is created
    stop = openSignInDialog((result) => {
      results.push(result);
      stop?.();
    });

    expect(() =>
      handlers.dialogMessageReceived({
        message: JSON.stringify(session),
        origin: window.location.origin,
      }),
    ).not.toThrow();

    expect(results).toEqual([session]);
    expect(close).toHaveBeenCalledTimes(1);
  });

  // The login page hands a kept cookie session over without a form; a user
  // switching accounts needs the form, so the pane has to ask for it.
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
});
