import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useInviteCreate } from './useInviteCreate';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  invalidateQueries: vi.fn(),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getInvitesControllerGetInvitesQueryKey: () => ['invites'],
  useInvitesControllerCreate: () => ({
    mutate: mocks.mutate,
    isPending: false,
  }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(useInviteCreate.name, () => {
  beforeEach(() => vi.clearAllMocks());
  it('sends selected teams with the single invitation', () => {
    const { result } = renderHook(() => useInviteCreate());
    const data = {
      email: 'anna@bamberg.example',
      role: 'user' as const,
      teamIds: ['ee40f380-2a21-4ca8-a76d-a0f9977ad64e'],
    };
    act(() => result.current.createInvite(data));
    expect(mocks.mutate).toHaveBeenCalledWith({ data });
  });
});
