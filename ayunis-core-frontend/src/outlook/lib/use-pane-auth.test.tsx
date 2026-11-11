import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PaneSession } from '@/outlook/api/pane-session';
import { usePaneAuth } from '@/outlook/lib/use-pane-auth';

const session = {
  restore: () => Promise.resolve(null),
} as unknown as PaneSession;

function stubOffice() {
  const displayDialogAsync = vi.fn();
  vi.stubGlobal('Office', {
    AsyncResultStatus: { Succeeded: 'succeeded', Failed: 'failed' },
    EventType: {
      DialogMessageReceived: 'dialogMessageReceived',
      DialogEventReceived: 'dialogEventReceived',
    },
    context: { ui: { displayDialogAsync } },
  });
  return displayDialogAsync;
}

describe('usePaneAuth', () => {
  afterEach(() => vi.unstubAllGlobals());

  // On a cold desktop start Office.js is not ready when the pane loads. A
  // verdict taken then must not stick to the pane for good.
  it('signs in once Office becomes available after a refused attempt', async () => {
    const displayDialogAsync = stubOffice();
    const officeAvailable = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    const { result } = renderHook(() => usePaneAuth(session, officeAvailable));
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

    act(() => result.current.signIn());
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: 'signedOut',
        error: 'outlookRequired',
      }),
    );
    expect(displayDialogAsync).not.toHaveBeenCalled();

    act(() => result.current.signIn());
    await waitFor(() => expect(result.current.state.status).toBe('signingIn'));
    expect(displayDialogAsync).toHaveBeenCalledTimes(1);
  });

  it('does not stay on signing in when the Office wait fails', async () => {
    stubOffice();
    const officeAvailable = vi
      .fn<() => Promise<boolean>>()
      .mockRejectedValue(new Error('Office.js has not fully loaded'));
    const { result } = renderHook(() => usePaneAuth(session, officeAvailable));
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

    act(() => result.current.signIn());
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: 'signedOut',
        error: 'outlookRequired',
      }),
    );
  });
});
