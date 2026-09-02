import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSuperAdminUnlockUserAccount } from './useSuperAdminUnlockUserAccount';

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  invalidateRouter: vi.fn(),
  mutate: vi.fn(),
  mutationOptions: undefined as { onSuccess: () => Promise<void> } | undefined,
  showSuccess: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: mocks.invalidateRouter }),
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getSuperAdminUserListControllerGetAllUsersQueryKey: () => ['all-users'],
  getSuperAdminUsersControllerGetUsersByOrgIdQueryKey: (orgId: string) => [
    'org-users',
    orgId,
  ],
  useSuperAdminUsersControllerUnlockUser: (options: {
    mutation: { onSuccess: () => Promise<void> };
  }) => {
    mocks.mutationOptions = options.mutation;
    return { mutate: mocks.mutate, isPending: false };
  },
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: mocks.showSuccess,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(useSuperAdminUnlockUserAccount.name, () => {
  beforeEach(() => vi.clearAllMocks());

  it('refreshes both super-admin user views after unlocking', async () => {
    renderHook(() => useSuperAdminUnlockUserAccount('org-1'));

    await act(() => mocks.mutationOptions?.onSuccess());

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['all-users'],
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['org-users', 'org-1'],
    });
    expect(mocks.invalidateRouter).toHaveBeenCalledOnce();
    expect(mocks.showSuccess).toHaveBeenCalledWith('unlock.success');
  });
});
