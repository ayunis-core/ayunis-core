import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { McpIntegrationsPage } from './mcp-integrations-page';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock(
  '@/pages/admin-settings/integrations-settings/api/useMcpIntegrationsQueries',
  () => ({
    useMcpIntegrationsQueries: () => ({
      integrations: [],
      isLoadingIntegrations: false,
      integrationsError: mcpQuery.error,
      refetchIntegrations: vi.fn(),
      predefinedConfigs: [],
    }),
  }),
);

const { outlookAddinEnabled, mcpQuery } = vi.hoisted(() => ({
  outlookAddinEnabled: { current: false },
  mcpQuery: { error: null as Error | null },
}));
vi.mock('@/features/feature-toggles', () => ({
  useIsFeatureEnabled: (feature: string) =>
    feature === 'outlookAddinEnabled' && outlookAddinEnabled.current,
}));

vi.mock('@/features/marketplace', () => ({
  useMarketplaceConfig: () => ({ enabled: false }),
}));

vi.mock('@/shared/ui/help-link/HelpLink', () => ({ HelpLink: () => null }));

vi.mock('@ayunis/ui/components/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => children,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => children,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('./integrations-list', () => ({ IntegrationsList: () => null }));
vi.mock('./create-predefined-dialog', () => ({
  CreatePredefinedDialog: () => null,
}));
vi.mock('./create-custom-dialog', () => ({
  CreateCustomDialog: ({ open }: { open: boolean }) =>
    open ? <div>custom-dialog-open</div> : null,
}));
vi.mock('./edit-integration-dialog', () => ({
  EditIntegrationDialog: () => null,
}));
vi.mock('./delete-confirmation-dialog', () => ({
  DeleteConfirmationDialog: () => null,
}));
vi.mock('./coming-soon-dialog', () => ({ ComingSoonDialog: () => null }));
vi.mock('@/pages/admin-settings/admin-settings-layout', () => ({
  default: ({
    action,
    children,
  }: {
    action: ReactNode;
    children: ReactNode;
  }) => (
    <div>
      {action}
      {children}
    </div>
  ),
}));

beforeEach(() => {
  outlookAddinEnabled.current = false;
  mcpQuery.error = null;
});

it('offers custom integration creation on cloud deployments', () => {
  render(<McpIntegrationsPage isCloud />);

  fireEvent.click(
    screen.getByRole('button', { name: 'integrations.page.addCustom' }),
  );

  expect(screen.getByText('custom-dialog-open')).toBeTruthy();
});

it('shows admins the Outlook add-in manifest URL while the add-in is enabled', () => {
  outlookAddinEnabled.current = true;
  render(<McpIntegrationsPage isCloud />);

  expect(screen.getByTestId('outlook-addin-manifest-url').textContent).toMatch(
    /^https?:\/\/[^/]+\/.*office-addins\/outlook\/manifest\.xml$/,
  );
});

it('leaves the Outlook add-in out while it is disabled', () => {
  render(<McpIntegrationsPage isCloud />);

  expect(screen.queryByTestId('outlook-addin-section')).toBeNull();
});

// The add-in has nothing to do with the MCP integrations.
it('keeps the Outlook add-in instructions when the MCP integrations fail to load', () => {
  outlookAddinEnabled.current = true;
  mcpQuery.error = new Error('MCP down');
  render(<McpIntegrationsPage isCloud />);

  expect(screen.getByTestId('outlook-addin-section')).toBeTruthy();
});
