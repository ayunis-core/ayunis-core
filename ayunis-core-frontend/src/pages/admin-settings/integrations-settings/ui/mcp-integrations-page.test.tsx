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
vi.mock('./connections-section', () => ({
  ConnectionsSection: ({
    officeAddinsEnabled,
  }: {
    officeAddinsEnabled: boolean;
  }) =>
    officeAddinsEnabled ? <div data-testid="office-add-ins-item" /> : null,
}));
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
  render(<McpIntegrationsPage isCloud page={1} />);

  fireEvent.click(
    screen.getByRole('button', { name: 'integrations.page.addCustom' }),
  );

  expect(screen.getByText('custom-dialog-open')).toBeTruthy();
});

it('lists the Office add-ins while the Outlook add-in is enabled', () => {
  outlookAddinEnabled.current = true;
  render(<McpIntegrationsPage isCloud page={1} />);

  expect(screen.getByTestId('office-add-ins-item')).toBeTruthy();
});

it('leaves the Office add-ins out while the Outlook add-in is disabled', () => {
  render(<McpIntegrationsPage isCloud page={1} />);

  expect(screen.queryByTestId('office-add-ins-item')).toBeNull();
});

// The add-ins have nothing to do with the MCP integrations.
it('keeps the Office add-ins when the MCP integrations fail to load', () => {
  outlookAddinEnabled.current = true;
  mcpQuery.error = new Error('MCP down');
  render(<McpIntegrationsPage isCloud page={1} />);

  expect(screen.getByTestId('office-add-ins-item')).toBeTruthy();
});
