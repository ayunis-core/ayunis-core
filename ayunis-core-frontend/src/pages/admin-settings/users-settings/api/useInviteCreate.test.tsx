import { renderHook } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useInviteCreate } from './useInviteCreate';

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  invalidateRouter: vi.fn(),
  mutate: vi.fn(),
  mutationOptions: undefined as
    { onError: (error: unknown) => void } | undefined,
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: mocks.invalidateRouter }),
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getInvitesControllerGetInvitesQueryKey: () => ['invites'],
  useInvitesControllerCreate: (options: {
    mutation: { onError: (error: unknown) => void };
  }) => {
    mocks.mutationOptions = options.mutation;
    return { mutate: mocks.mutate, isPending: false, isError: false };
  },
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function errorWithCode(code: string, status: number): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', undefined, config, undefined, {
    data: { code, message: code },
    status,
    statusText: '',
    headers: {},
    config,
  });
}

describe(useInviteCreate.name, () => {
  beforeEach(() => vi.clearAllMocks());

  // Regression for AYC-1131: the invite used to silently order an extra seat,
  // so the admin never saw that the seat limit was reached.
  it('explains that the seat limit is reached when the subscription has no seat left', () => {
    renderHook(() => useInviteCreate());

    mocks.mutationOptions?.onError(errorWithCode('SEAT_LIMIT_REACHED', 409));

    expect(mocks.showError).toHaveBeenCalledWith(
      'inviteCreate.seatLimitReached',
    );
  });

  it('falls back to the generic message for unknown error codes', () => {
    renderHook(() => useInviteCreate());

    mocks.mutationOptions?.onError(errorWithCode('SOMETHING_ELSE', 500));

    expect(mocks.showError).toHaveBeenCalledWith('inviteCreate.error');
  });
});
