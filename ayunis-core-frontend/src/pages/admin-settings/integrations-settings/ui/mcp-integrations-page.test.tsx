import { render, screen } from '@testing-library/react';
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
    }),
  }),
);

const { connectorsEnabled, mcpQuery } = vi.hoisted(() => ({
  connectorsEnabled: { current: false },
  mcpQuery: { error: null as Error | null },
}));
vi.mock('@/features/feature-toggles', () => ({
  useIsFeatureEnabled: (feature: string) =>
    feature === 'connectorsEnabled' && connectorsEnabled.current,
}));

vi.mock('@/shared/ui/help-link/HelpLink', () => ({ HelpLink: () => null }));

vi.mock('./integrations-list', () => ({ IntegrationsList: () => null }));
vi.mock('./add-integration-menu', () => ({ AddIntegrationMenu: () => null }));
vi.mock('./edit-integration-dialog', () => ({
  EditIntegrationDialog: () => null,
}));
vi.mock('./delete-confirmation-dialog', () => ({
  DeleteConfirmationDialog: () => null,
}));
vi.mock('./connections-section', () => ({
  ConnectionsSection: () => <div data-testid="office-add-ins-item" />,
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
  connectorsEnabled.current = false;
  mcpQuery.error = null;
});

it('lists the Office add-ins without a feature toggle', () => {
  render(<McpIntegrationsPage page={1} />);

  expect(screen.getByTestId('office-add-ins-item')).toBeTruthy();
});

// The add-ins have nothing to do with the MCP integrations.
it('keeps the Office add-ins when the MCP integrations fail to load', () => {
  mcpQuery.error = new Error('MCP down');
  render(<McpIntegrationsPage page={1} />);

  expect(screen.getByTestId('office-add-ins-item')).toBeTruthy();
});
