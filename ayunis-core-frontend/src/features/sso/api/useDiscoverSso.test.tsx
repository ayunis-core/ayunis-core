import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDiscoverSso } from '@/features/sso/api/useDiscoverSso';

const { mutateAsync } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useSsoLoginControllerDiscover: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

describe(useDiscoverSso.name, () => {
  beforeEach(() => vi.clearAllMocks());

  it('discovers SSO through the generated API client', async () => {
    const response = { available: true, orgId: 'org-id' };
    mutateAsync.mockResolvedValue(response);
    const { result } = renderHook(() => useDiscoverSso());

    await expect(
      act(() => result.current.discover('staff@stadt.de')),
    ).resolves.toEqual(response);
    expect(mutateAsync).toHaveBeenCalledWith({
      data: { email: 'staff@stadt.de' },
    });
  });

  it('exposes discovery failures to the calling flow', async () => {
    const error = new Error('network unavailable');
    mutateAsync.mockRejectedValue(error);
    const { result } = renderHook(() => useDiscoverSso());

    await expect(
      act(() => result.current.discover('staff@stadt.de')),
    ).rejects.toBe(error);
  });
});
