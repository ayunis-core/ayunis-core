import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import SsoSection from '@/pages/super-admin-settings/org/ui/SsoSection';

const { configure, setEnabled, setJit } = vi.hoisted(() => ({
  configure: vi.fn(),
  setEnabled: vi.fn(),
  setJit: vi.fn(),
}));

vi.mock(
  '@/pages/super-admin-settings/org/api/useConfigureSuperAdminSso',
  () => ({
    useConfigureSuperAdminSso: () => ({ configure, isPending: false }),
  }),
);
vi.mock(
  '@/pages/super-admin-settings/org/api/useSetSuperAdminSsoEnabled',
  () => ({
    useSetSuperAdminSsoEnabled: () => ({
      mutate: setEnabled,
      isPending: false,
    }),
  }),
);
vi.mock('@/pages/super-admin-settings/org/api/useSetSuperAdminSsoJit', () => ({
  useSetSuperAdminSsoJit: () => ({ mutate: setJit, isPending: false }),
}));
vi.mock(
  '@/pages/super-admin-settings/org/api/useSuperAdminSsoConnection',
  () => ({
    useSuperAdminSsoConnection: () => ({
      connection: {
        orgId: 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
        emailDomain: 'example.com',
        zitadelOrgId: '385820595704561666',
        zitadelIdpId: null,
        enabled: true,
        jitProvisioningEnabled: false,
      },
      isLoading: false,
      isError: false,
    }),
  }),
);
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/pages/super-admin-settings/org/ui/EnableSsoDialog', () => ({
  default: () => null,
}));

describe(SsoSection.name, () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => vi.clearAllMocks());

  it('renders the direct identity provider input', () => {
    render(<SsoSection orgId="f4fcdc42-176e-4d32-bd5b-6dad8d2426b4" />);

    expect(screen.getByTestId('sso-zitadel-idp-id')).toBeTruthy();
  });

  it('requires an identity provider before saving direct routing', async () => {
    render(<SsoSection orgId="f4fcdc42-176e-4d32-bd5b-6dad8d2426b4" />);

    fireEvent.click(screen.getByTestId('sso-connection-save'));

    expect(
      await screen.findByText('sso.validation.zitadelIdpId.required'),
    ).toBeTruthy();
    expect(configure).not.toHaveBeenCalled();
  });

  it('saves a normalized identity provider ID', async () => {
    render(<SsoSection orgId="f4fcdc42-176e-4d32-bd5b-6dad8d2426b4" />);

    fireEvent.change(screen.getByTestId('sso-zitadel-idp-id'), {
      target: { value: ' 388145187060187138 ' },
    });
    fireEvent.click(screen.getByTestId('sso-connection-save'));

    await waitFor(() => {
      expect(configure).toHaveBeenCalledWith({
        emailDomain: 'example.com',
        zitadelOrgId: '385820595704561666',
        zitadelIdpId: '388145187060187138',
        domainVerified: false,
        updateMapping: false,
      });
    });
  });
});
