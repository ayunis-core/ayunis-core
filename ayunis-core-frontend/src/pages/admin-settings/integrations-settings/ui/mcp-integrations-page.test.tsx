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

const { outlookAddinEnabled, mcpQuery } = vi.hoisted(() => ({
  outlookAddinEnabled: { current: false },
  mcpQuery: { error: null as Error | null },
}));
vi.mock('@/features/feature-toggles', () => ({
  useIsFeatureEnabled: (feature: string) =>
    feature === 'outlookAddinEnabled' && outlookAddinEnabled.current,
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

it('lists the Office add-ins while the Outlook add-in is enabled', () => {
  outlookAddinEnabled.current = true;
  render(<McpIntegrationsPage page={1} />);

  expect(screen.getByTestId('office-add-ins-item')).toBeTruthy();
});

it('leaves the Office add-ins out while the Outlook add-in is disabled', () => {
  render(<McpIntegrationsPage page={1} />);

  expect(screen.queryByTestId('office-add-ins-item')).toBeNull();
});

// The add-ins have nothing to do with the MCP integrations.
it('keeps the Office add-ins when the MCP integrations fail to load', () => {
  outlookAddinEnabled.current = true;
  mcpQuery.error = new Error('MCP down');
  render(<McpIntegrationsPage page={1} />);

  expect(screen.getByTestId('office-add-ins-item')).toBeTruthy();
});
