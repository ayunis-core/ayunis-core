import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionHandoffRequestDtoClient } from '@ayunis/api-client/schemas';
import { handOverOfficeSession } from './session-handoff';

const { handoffMock } = vi.hoisted(() => ({ handoffMock: vi.fn() }));

vi.mock('@ayunis/api-client/endpoints', () => ({
  sessionHandoffControllerHandoff: handoffMock,
}));

const client = Object.values(SessionHandoffRequestDtoClient)[0];
const tokens = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresIn: 3600,
};

function stubOffice(messageParent: (message: string) => void): void {
  vi.stubGlobal('Office', {
    onReady: () => Promise.resolve(),
    context: { ui: { messageParent }, displayLanguage: 'en-US' },
  });
}

function config(statusElement: HTMLElement) {
  return {
    apiBaseUrl: '/api',
    client,
    statusElement,
    copy: () => ({
      connectingText: 'Connecting',
      officeRequiredText: 'Open inside Office',
    }),
  };
}

describe('handOverOfficeSession', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', `?client=${client}`);
    handoffMock.mockResolvedValue(tokens);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    handoffMock.mockReset();
  });

  it('hands a new bearer session to the originating pane', async () => {
    const messageParent = vi.fn();
    const status = document.createElement('div');
    stubOffice(messageParent);

    await handOverOfficeSession(config(status));

    expect(handoffMock).toHaveBeenCalledWith({ client });
    expect(JSON.parse(messageParent.mock.calls[0][0] as string)).toEqual({
      type: 'session',
      ...tokens,
    });
    expect(status.textContent).toBe('Connecting');
  });

  it('resolves dialog copy after Office becomes ready', async () => {
    let finishReady: (() => void) | undefined;
    const copy = vi.fn(() => ({
      connectingText: 'Verbinden',
      officeRequiredText: 'In Office öffnen',
    }));
    const status = document.createElement('div');
    vi.stubGlobal('Office', {
      onReady: () =>
        new Promise<void>((resolve) => {
          finishReady = resolve;
        }),
      context: { ui: { messageParent: vi.fn() } },
    });

    const handingOver = handOverOfficeSession({ ...config(status), copy });
    expect(copy).not.toHaveBeenCalled();
    finishReady?.();
    await handingOver;

    expect(copy).toHaveBeenCalledOnce();
    expect(status.textContent).toBe('Verbinden');
  });

  it('does not mint tokens for a different surface client', async () => {
    const messageParent = vi.fn();
    window.history.replaceState({}, '', '?client=unexpected');
    stubOffice(messageParent);

    await handOverOfficeSession(config(document.createElement('div')));

    expect(handoffMock).not.toHaveBeenCalled();
    expect(JSON.parse(messageParent.mock.calls[0][0] as string)).toEqual({
      type: 'error',
      code: 'UNKNOWN_CLIENT',
    });
  });

  it('does not mint orphaned tokens outside an Office dialog', async () => {
    const status = document.createElement('div');
    vi.stubGlobal('Office', undefined);

    await handOverOfficeSession(config(status));

    expect(handoffMock).not.toHaveBeenCalled();
    expect(status.textContent).toBe('Open inside Office');
  });
});
