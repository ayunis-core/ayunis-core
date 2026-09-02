import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminUnlockUserAccount } from './useAdminUnlockUserAccount';

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  invalidateRouter: vi.fn(),
  mutate: vi.fn(),
  mutationOptions: undefined as
    | { onSuccess: () => Promise<void>; onError: (error: unknown) => void }
    | undefined,
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
  getUserControllerGetUsersInOrganizationQueryKey: () => ['org-users'],
  useAdminUserAccountLockControllerUnlock: (options: {
    mutation: {
      onSuccess: () => Promise<void>;
      onError: (error: unknown) => void;
    };
  }) => {
    mocks.mutationOptions = options.mutation;
    return { mutate: mocks.mutate, isPending: false };
  },
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(useAdminUnlockUserAccount.name, () => {
  beforeEach(() => vi.clearAllMocks());

  it('refreshes the organization user list after unlocking', async () => {
    renderHook(() => useAdminUnlockUserAccount());

    await act(() => mocks.mutationOptions?.onSuccess());

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['org-users'],
    });
    expect(mocks.invalidateRouter).toHaveBeenCalledOnce();
    expect(mocks.showSuccess).toHaveBeenCalledWith('unlock.success');
  });
});
