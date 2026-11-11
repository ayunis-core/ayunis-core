import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketplaceIntegrationResponseDto } from '@/pages/install/api/useFetchMarketplaceIntegration';
import InstallIntegrationPage from './InstallIntegrationPage';

const mocks = vi.hoisted(() => ({
  integration: null as MarketplaceIntegrationResponseDto | null,
  mutate: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock('@/layouts/app-layout', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock(
  '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout',
  () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
  }),
);
vi.mock('@/features/marketplace', () => ({
  useMarketplaceConfig: () => ({ url: 'https://marketplace.test' }),
}));
vi.mock('@/features/mcp-oauth', () => ({
  useMcpOAuthClientMetadata: () => ({ callbackUri: 'https://callback.test' }),
}));
vi.mock('@/pages/install/api/useFetchMarketplaceIntegration', () => ({
  useMarketplaceControllerGetIntegration: () => ({
    data: mocks.integration,
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('@/pages/install/api/useInstallIntegrationFromMarketplace', () => ({
  useInstallIntegrationFromMarketplace: () => ({
    mutate: mocks.mutate,
    isPending: false,
  }),
}));
vi.mock('@ayunis/ui/components/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <input
      {...props}
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
  ),
}));

const fixedIntegration = {
  id: 'integration-id',
  identifier: 'oparl',
  name: 'OParl',
  shortDescription: 'Council data',
  description: 'Council data',
  iconName: null,
  logoUrl: null,
  integrationCategoryId: null,
  serverUrl: 'https://mcp.ayunis.de/oparl',
  customerProvidesServerUrl: false,
  serverUrlHint: null,
  configSchema: { authType: 'NO_AUTH', orgFields: [], userFields: [] },
  featured: false,
  published: true,
  preInstalled: false,
  legalTextUrl: null,
  legalTextVersion: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
} as MarketplaceIntegrationResponseDto;

const customerProvided = {
  ...fixedIntegration,
  identifier: 'openproject',
  name: 'OpenProject',
  serverUrl: null,
  customerProvidesServerUrl: true,
  serverUrlHint: 'Your OpenProject MCP address',
} as MarketplaceIntegrationResponseDto;

function renderPage(integration: MarketplaceIntegrationResponseDto) {
  mocks.integration = integration;
  render(
    <InstallIntegrationPage integrationIdentifier={integration.identifier} />,
  );
  fireEvent.click(screen.getByRole('checkbox'));
}

function installButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'action.install' });
}

describe('InstallIntegrationPage server URL', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks for the URL with the marketplace hint and requires it', () => {
    renderPage(customerProvided);

    expect(screen.getByTestId('install-server-url')).toBeTruthy();
    expect(screen.getByText('Your OpenProject MCP address')).toBeTruthy();
    expect(installButton().disabled).toBe(true);
  });

  it('rejects a URL that is not http or https', async () => {
    renderPage(customerProvided);

    fireEvent.change(screen.getByTestId('install-server-url'), {
      target: { value: 'file:///etc/mcp' },
    });
    fireEvent.click(installButton());

    expect(await screen.findByText('serverUrl.invalid')).toBeTruthy();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('installs with the entered URL', async () => {
    renderPage(customerProvided);

    fireEvent.change(screen.getByTestId('install-server-url'), {
      target: { value: ' https://projekte.stadt.de/mcp ' },
    });
    fireEvent.click(installButton());

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith({
        data: {
          identifier: 'openproject',
          orgConfigValues: {},
          serverUrl: 'https://projekte.stadt.de/mcp',
        },
      }),
    );
  });

  it('installs entries with a fixed URL without asking for one', async () => {
    renderPage(fixedIntegration);

    expect(screen.queryByTestId('install-server-url')).toBeNull();
    fireEvent.click(installButton());

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith({
        data: { identifier: 'oparl', orgConfigValues: {} },
      }),
    );
  });
});
