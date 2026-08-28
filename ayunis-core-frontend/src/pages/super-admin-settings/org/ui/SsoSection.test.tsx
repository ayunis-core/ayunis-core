import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { UseFormReturn } from 'react-hook-form';
import type { SsoConnectionFormFields } from '@/pages/super-admin-settings/org/model/types';
import SsoSection from '@/pages/super-admin-settings/org/ui/SsoSection';

const { configure, setEnabled, setJit, connectionState, formState } =
  vi.hoisted(() => ({
    configure: vi.fn(),
    setEnabled: vi.fn(),
    setJit: vi.fn(),
    connectionState: { enabled: true },
    formState: {
      form: null as UseFormReturn<SsoConnectionFormFields> | null,
    },
  }));

vi.mock(
  '@/pages/super-admin-settings/org/api/useConfigureSuperAdminSso',
  () => ({
    useConfigureSuperAdminSso: (
      _orgId: string,
      form: UseFormReturn<SsoConnectionFormFields>,
    ) => {
      formState.form = form;
      return { configure, isPending: false };
    },
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
        emailDomains: [
          {
            emailDomain: 'example.com',
            verifiedAt: '2026-08-27T12:00:00.000Z',
          },
        ],
        zitadelOrgId: '385820595704561666',
        zitadelIdpId: null,
        enabled: connectionState.enabled,
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
  beforeEach(() => {
    vi.clearAllMocks();
    connectionState.enabled = true;
    formState.form = null;
  });

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
        emailDomains: [{ value: 'example.com' }],
        zitadelOrgId: '385820595704561666',
        zitadelIdpId: '388145187060187138',
        domainVerified: false,
        updateMapping: false,
      });
    });
  });

  it('adds and submits another verified domain', async () => {
    connectionState.enabled = false;
    render(<SsoSection orgId="f4fcdc42-176e-4d32-bd5b-6dad8d2426b4" />);

    fireEvent.click(screen.getByTestId('sso-add-email-domain'));
    fireEvent.change(screen.getByTestId('sso-email-domain-1'), {
      target: { value: ' Other.Example ' },
    });
    fireEvent.change(screen.getByTestId('sso-zitadel-idp-id'), {
      target: { value: '388145187060187138' },
    });
    fireEvent.click(screen.getByTestId('sso-domain-verified'));
    fireEvent.click(screen.getByTestId('sso-connection-save'));

    await waitFor(() => {
      expect(configure).toHaveBeenCalledWith({
        emailDomains: [{ value: 'example.com' }, { value: 'Other.Example' }],
        zitadelOrgId: '385820595704561666',
        zitadelIdpId: '388145187060187138',
        domainVerified: true,
        updateMapping: true,
      });
    });
  });

  it('clears a domain-list error after correction and allows resubmission', async () => {
    connectionState.enabled = false;
    render(<SsoSection orgId="f4fcdc42-176e-4d32-bd5b-6dad8d2426b4" />);

    act(() => {
      formState.form?.setError('emailDomains', {
        message: 'sso.validation.emailDomains.arrayUnique',
      });
    });

    expect(
      await screen.findByText('sso.validation.emailDomains.arrayUnique'),
    ).toBeTruthy();

    fireEvent.change(screen.getByTestId('sso-email-domain-0'), {
      target: { value: 'corrected.example' },
    });
    expect(
      screen.queryByText('sso.validation.emailDomains.arrayUnique'),
    ).toBeNull();

    fireEvent.change(screen.getByTestId('sso-zitadel-idp-id'), {
      target: { value: '388145187060187138' },
    });
    fireEvent.click(screen.getByTestId('sso-domain-verified'));
    fireEvent.click(screen.getByTestId('sso-connection-save'));

    await waitFor(() => expect(configure).toHaveBeenCalledOnce());
  });
});
