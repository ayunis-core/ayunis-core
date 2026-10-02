import { renderHook } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBulkInviteCreate } from './useBulkInviteCreate';

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
  getSuperAdminInvitesControllerGetInvitesQueryKey: () => ['super-invites'],
  getSuperAdminUsersControllerGetUsersByOrgIdQueryKey: () => ['super-users'],
  useInvitesControllerCreateBulk: (options: {
    mutation: { onError: (error: unknown) => void };
  }) => {
    mocks.mutationOptions = options.mutation;
    return { mutate: mocks.mutate, isPending: false, isError: false };
  },
  useSuperAdminInvitesControllerCreateBulk: () => ({
    mutate: mocks.mutate,
    isPending: false,
    isError: false,
  }),
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

describe(useBulkInviteCreate.name, () => {
  beforeEach(() => vi.clearAllMocks());

  // Regression for AYC-1131: the import used to order the missing seats
  // automatically instead of telling the admin the batch was too large.
  it('explains that the seat limit is reached when the batch exceeds the available seats', () => {
    const onError = vi.fn();
    renderHook(() => useBulkInviteCreate(undefined, undefined, onError));

    mocks.mutationOptions?.onError(errorWithCode('SEAT_LIMIT_REACHED', 409));

    expect(mocks.showError).toHaveBeenCalledWith('bulkInvite.seatLimitReached');
    expect(onError).toHaveBeenCalledWith([]);
  });

  it('keeps per-row feedback for validation failures', () => {
    renderHook(() => useBulkInviteCreate());

    mocks.mutationOptions?.onError(
      errorWithCode('BULK_INVITE_VALIDATION_FAILED', 400),
    );

    expect(mocks.showError).toHaveBeenCalledWith('bulkInvite.validationFailed');
  });
});
