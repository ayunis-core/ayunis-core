import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLogout } from '@/widgets/app-sidebar/api/useLogout';

const {
  clearAppsignalTags,
  mutate,
  navigate,
  navigateToExternalUrl,
  showError,
} = vi.hoisted(() => ({
  clearAppsignalTags: vi.fn(),
  mutate: vi.fn(),
  navigate: vi.fn(),
  navigateToExternalUrl: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useLogoutControllerLogout: () => ({ mutate, isPending: false }),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));
vi.mock('@/shared/lib/appsignal', () => ({ clearAppsignalTags }));
vi.mock('@/features/sso', () => ({
  navigateToExternalUrl,
}));
vi.mock('@/shared/lib/toast', () => ({ showError }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(useLogout.name, () => {
  beforeEach(() => vi.clearAllMocks());

  function setup() {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['private'], { id: 'user' });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, ...renderHook(() => useLogout(), { wrapper }) };
  }

  it('finishes a local logout on the login page', () => {
    const { result, queryClient } = setup();
    act(() => result.current.logout());
    mutate.mock.calls[0]?.[1].onSuccess({ brokerLogoutUrl: null });

    expect(queryClient.getQueryData(['private'])).toBeUndefined();
    expect(clearAppsignalTags).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith({ to: '/login' });
  });

  it('continues an SSO logout at the broker', () => {
    const { result } = setup();
    act(() => result.current.logout());
    mutate.mock.calls[0]?.[1].onSuccess({
      brokerLogoutUrl: 'https://sso.ayunis.de/end-session',
    });

    expect(navigateToExternalUrl).toHaveBeenCalledWith(
      'https://sso.ayunis.de/end-session',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('clears browser state and reports a logout failure', () => {
    const { result, queryClient } = setup();
    act(() => result.current.logout());
    mutate.mock.calls[0]?.[1].onError(new Error('network unavailable'));

    expect(queryClient.getQueryData(['private'])).toBeUndefined();
    expect(showError).toHaveBeenCalledWith('sidebar.logout.error');
    expect(navigate).toHaveBeenCalledWith({ to: '/login' });
  });
});
