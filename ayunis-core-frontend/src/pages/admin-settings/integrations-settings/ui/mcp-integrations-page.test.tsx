import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
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
      integrationsError: null,
      refetchIntegrations: vi.fn(),
      predefinedConfigs: [],
    }),
  }),
);

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

it('offers custom integration creation on cloud deployments', () => {
  render(<McpIntegrationsPage isCloud />);

  fireEvent.click(
    screen.getByRole('button', { name: 'integrations.page.addCustom' }),
  );

  expect(screen.getByText('custom-dialog-open')).toBeTruthy();
});
