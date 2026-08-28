import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConfigureSuperAdminSso } from '@/pages/super-admin-settings/org/api/useConfigureSuperAdminSso';
import type { SsoConnectionFormFields } from '@/pages/super-admin-settings/org/model/types';

const { configureConnection, setIdp } = vi.hoisted(() => ({
  configureConnection: vi.fn(),
  setIdp: vi.fn(),
}));

vi.mock('@/shared/api', () => ({
  getSuperAdminSsoConnectionsControllerGetQueryKey: () => ['sso'],
  superAdminSsoConnectionsControllerConfigure: configureConnection,
  superAdminSsoConnectionsControllerSetIdp: setIdp,
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(useConfigureSuperAdminSso.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureConnection.mockResolvedValue(undefined);
    setIdp.mockResolvedValue(undefined);
  });

  it('updates only the IdP hint when the routing mapping is locked', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const form = {
      setError: vi.fn(),
    } as unknown as UseFormReturn<SsoConnectionFormFields>;
    const { result } = renderHook(
      () => useConfigureSuperAdminSso('org-id', form),
      { wrapper },
    );

    act(() =>
      result.current.configure({
        emailDomains: [{ value: 'example.com' }],
        zitadelOrgId: '385820595704561666',
        zitadelIdpId: '388145187060187138',
        domainVerified: false,
        updateMapping: false,
      }),
    );

    await waitFor(() => expect(setIdp).toHaveBeenCalledOnce());
    expect(configureConnection).not.toHaveBeenCalled();
    expect(setIdp).toHaveBeenCalledWith('org-id', {
      zitadelIdpId: '388145187060187138',
    });
  });

  it('configures an editable mapping and its IdP atomically', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const form = {
      setError: vi.fn(),
    } as unknown as UseFormReturn<SsoConnectionFormFields>;
    const { result } = renderHook(
      () => useConfigureSuperAdminSso('org-id', form),
      { wrapper },
    );

    act(() =>
      result.current.configure({
        emailDomains: [{ value: 'example.com' }, { value: 'other.example' }],
        zitadelOrgId: '385820595704561666',
        zitadelIdpId: '388145187060187138',
        domainVerified: true,
        updateMapping: true,
      }),
    );

    await waitFor(() => expect(configureConnection).toHaveBeenCalledOnce());
    expect(configureConnection).toHaveBeenCalledWith('org-id', {
      emailDomains: ['example.com', 'other.example'],
      zitadelOrgId: '385820595704561666',
      zitadelIdpId: '388145187060187138',
      domainVerified: true,
    });
    expect(setIdp).not.toHaveBeenCalled();
  });
});
