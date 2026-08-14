import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStartSsoLink } from '@/features/sso/api/useStartSsoLink';

const { mutate, navigateToExternalUrl, showError } = vi.hoisted(() => ({
  mutate: vi.fn(),
  navigateToExternalUrl: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useSsoLoginControllerStartLink: () => ({ mutate, isPending: false }),
}));

vi.mock('@/features/sso/lib/sso-navigation', () => ({
  navigateToExternalUrl,
}));

vi.mock('@/shared/lib/toast', () => ({ showError }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(useStartSsoLink.name, () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens the returned broker authorization URL', () => {
    const { result } = renderHook(() => useStartSsoLink());
    act(() => result.current.startLink());

    const options = mutate.mock.calls[0]?.[1];
    options.onSuccess({ authorizationUrl: 'https://sso.ayunis.de/authorize' });
    expect(navigateToExternalUrl).toHaveBeenCalledWith(
      'https://sso.ayunis.de/authorize',
    );
  });

  it('surfaces a start failure without navigating', () => {
    const { result } = renderHook(() => useStartSsoLink());
    act(() => result.current.startLink());

    const options = mutate.mock.calls[0]?.[1];
    options.onError(new Error('unavailable'));
    expect(showError).toHaveBeenCalledWith('account.sso.linkError');
    expect(navigateToExternalUrl).not.toHaveBeenCalled();
  });
});
