import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { OfficeAddinSession } from './session';
import type { OpenOfficeSignInDialog } from './sign-in-dialog';
import { useOfficeAddinAuth } from './auth';

const session = {
  restore: () => Promise.resolve(null),
  onEnd: () => () => undefined,
} as unknown as OfficeAddinSession;

function unusedDialog(): OpenOfficeSignInDialog {
  return () => () => undefined;
}

it('signs in once Office becomes available after a refused attempt', async () => {
  const openSignInDialog = vi.fn<OpenOfficeSignInDialog>(() => () => {});
  const officeAvailable = vi
    .fn<() => Promise<boolean>>()
    .mockResolvedValueOnce(false)
    .mockResolvedValue(true);
  const { result } = renderHook(() =>
    useOfficeAddinAuth(session, officeAvailable, openSignInDialog),
  );
  await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

  act(() => result.current.signIn());
  await waitFor(() =>
    expect(result.current.state).toEqual({
      status: 'signedOut',
      error: 'hostRequired',
    }),
  );
  expect(openSignInDialog).not.toHaveBeenCalled();

  act(() => result.current.signIn());
  await waitFor(() => expect(result.current.state.status).toBe('signingIn'));
  expect(openSignInDialog).toHaveBeenCalledTimes(1);
});

it('does not stay on signing in when the Office wait fails', async () => {
  const officeAvailable = vi
    .fn<() => Promise<boolean>>()
    .mockRejectedValue(new Error('Office.js has not fully loaded'));
  const { result } = renderHook(() =>
    useOfficeAddinAuth(session, officeAvailable, unusedDialog()),
  );
  await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

  act(() => result.current.signIn());
  await waitFor(() =>
    expect(result.current.state).toEqual({
      status: 'signedOut',
      error: 'hostRequired',
    }),
  );
});

it.each([
  ['expired', { status: 'signedOut', error: 'sessionExpired' }],
  ['signedOut', { status: 'signedOut' }],
] as const)(
  'shows the sign-in when the session ends (%s) while signed in',
  async (reason, expected) => {
    const onEnd = vi.fn<OfficeAddinSession['onEnd']>(() => () => undefined);
    const signedIn = {
      restore: () => Promise.resolve({ id: 'user-1' }),
      onEnd,
    } as unknown as OfficeAddinSession;
    const { result } = renderHook(() =>
      useOfficeAddinAuth(signedIn, () => Promise.resolve(true), unusedDialog()),
    );
    await waitFor(() => expect(result.current.state.status).toBe('signedIn'));

    act(() => onEnd.mock.calls[0][0](reason));

    expect(result.current.state).toEqual(expected);
  },
);
