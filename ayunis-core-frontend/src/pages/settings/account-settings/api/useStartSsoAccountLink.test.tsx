import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStartSsoAccountLink } from './useStartSsoAccountLink';

const { start, navigate, showError } = vi.hoisted(() => ({
  start: vi.fn(),
  navigate: vi.fn(),
  showError: vi.fn(),
}));
vi.mock('@/shared/api', () => ({ ssoLoginControllerStartLink: start }));
vi.mock('@/features/sso', () => ({ navigateToExternalUrl: navigate }));
vi.mock('@/shared/lib/toast', () => ({ showError }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderMutation() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return renderHook(() => useStartSsoAccountLink(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

describe('starting SSO account linking', () => {
  beforeEach(() => vi.clearAllMocks());

  it('navigates to the authorization URL returned by the authenticated API', async () => {
    start.mockResolvedValue({
      authorizationUrl: 'https://broker.example/authorize',
    });
    const { result } = renderMutation();
    act(() => result.current.mutate());
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('https://broker.example/authorize'),
    );
  });

  it('shows retry feedback without navigating on network failure', async () => {
    start.mockRejectedValue(new Error('offline'));
    const { result } = renderMutation();
    act(() => result.current.mutate());
    await waitFor(() =>
      expect(showError).toHaveBeenCalledWith('account.sso.error'),
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('explains when eligibility changed before the user clicked', async () => {
    const error = new AxiosError('unavailable');
    error.response = {
      data: { code: 'SSO_CONNECTION_NOT_AVAILABLE' },
      status: 404,
      statusText: '',
      headers: {},
      config: { headers: {} },
    } as AxiosError['response'];
    start.mockRejectedValue(error);
    const { result } = renderMutation();
    act(() => result.current.mutate());
    await waitFor(() =>
      expect(showError).toHaveBeenCalledWith('account.sso.unavailable'),
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
