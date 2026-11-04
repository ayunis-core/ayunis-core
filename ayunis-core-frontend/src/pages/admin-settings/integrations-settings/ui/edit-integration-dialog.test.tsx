import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { McpIntegration } from '@/pages/admin-settings/integrations-settings/model/types';
import { EditIntegrationDialog } from './edit-integration-dialog';

const mocks = vi.hoisted(() => ({ updateIntegration: vi.fn() }));

vi.mock(
  '@/pages/admin-settings/integrations-settings/api/useUpdateIntegration',
  () => ({
    useUpdateIntegration: () => ({
      updateIntegration: mocks.updateIntegration,
      isUpdating: false,
    }),
  }),
);
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/features/mcp-oauth', () => ({
  useMcpOAuthClientMetadata: () => ({ callbackUri: 'https://callback.test' }),
}));

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

const integration = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Document archive',
  type: 'custom',
  serverUrl: 'https://documents.example.com/mcp',
  enabled: true,
  organizationId: '22222222-2222-2222-2222-222222222222',
  hasCredentials: false,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  returnsPii: true,
  configSchema: {
    authType: 'CUSTOM',
    orgFields: [
      {
        key: 'apiToken',
        label: 'API token',
        type: 'secret',
        headerName: 'X-Archive-Token',
        required: true,
      },
    ],
    userFields: [],
  },
  orgConfigValues: { apiToken: '••••••' },
} as McpIntegration;

describe(EditIntegrationDialog.name, () => {
  beforeEach(() => vi.clearAllMocks());

  it('exposes the custom server URL and header definitions', () => {
    render(
      <EditIntegrationDialog
        integration={integration}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      screen.getByDisplayValue('https://documents.example.com/mcp'),
    ).toBeTruthy();
    expect(screen.getByDisplayValue('X-Archive-Token')).toBeTruthy();
  });

  it('preserves a required stored secret when its input stays blank', async () => {
    render(
      <EditIntegrationDialog
        integration={integration}
        open
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('X-Archive-Token'), {
      target: { value: 'Authorization' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'integrations.editDialog.update',
      }),
    );

    await waitFor(() => expect(mocks.updateIntegration).toHaveBeenCalledOnce());
    expect(mocks.updateIntegration.mock.calls[0][1]).not.toHaveProperty(
      'orgConfigValues',
    );
  });

  it('closes without sending an update when nothing changed', async () => {
    const onOpenChange = vi.fn();
    render(
      <EditIntegrationDialog
        integration={integration}
        open
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'integrations.editDialog.update',
      }),
    );

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(mocks.updateIntegration).not.toHaveBeenCalled();
  });

  it('locks the scope and type of existing fields', () => {
    render(
      <EditIntegrationDialog
        integration={integration}
        open
        onOpenChange={vi.fn()}
      />,
    );

    const [scope, type] = screen.getAllByRole('combobox');
    expect((scope as HTMLButtonElement).disabled).toBe(true);
    expect((type as HTMLButtonElement).disabled).toBe(true);
  });

  describe('customer-provided marketplace server URL', () => {
    const marketplace = {
      ...integration,
      name: 'OpenProject',
      type: 'marketplace',
      marketplaceIdentifier: 'openproject',
      serverUrl: 'https://projekte.stadt.de/mcp',
      customerProvidesServerUrl: true,
      serverUrlHint: 'Your OpenProject MCP address',
      configSchema: { authType: 'NO_AUTH', orgFields: [], userFields: [] },
      orgConfigValues: {},
    } as McpIntegration;
    const staticOAuth = {
      ...marketplace,
      configSchema: {
        authType: 'OAUTH',
        orgFields: [],
        userFields: [],
        oauth: { clientRegistration: 'static', scopes: ['mcp'] },
      },
    } as McpIntegration;

    function renderDialog(target: McpIntegration) {
      render(
        <EditIntegrationDialog
          integration={target}
          open
          onOpenChange={vi.fn()}
        />,
      );
    }

    function changeServerUrl(value: string) {
      fireEvent.change(screen.getByTestId('integration-edit-server-url'), {
        target: { value },
      });
    }

    function submit() {
      fireEvent.click(
        screen.getByRole('button', { name: 'integrations.editDialog.update' }),
      );
    }

    it('shows the current URL with the marketplace hint', () => {
      renderDialog(marketplace);

      expect(
        screen.getByDisplayValue('https://projekte.stadt.de/mcp'),
      ).toBeTruthy();
      expect(screen.getByText('Your OpenProject MCP address')).toBeTruthy();
    });

    it('sends the changed URL', async () => {
      renderDialog(marketplace);

      changeServerUrl('https://neu.stadt.de/mcp');
      submit();

      await waitFor(() =>
        expect(mocks.updateIntegration).toHaveBeenCalledWith(marketplace.id, {
          serverUrl: 'https://neu.stadt.de/mcp',
        }),
      );
    });

    it('rejects a URL without http or https', async () => {
      renderDialog(marketplace);

      changeServerUrl('file:///etc/mcp');
      submit();

      expect(
        await screen.findByText('integrations.serverUrlChange.invalid'),
      ).toBeTruthy();
      expect(mocks.updateIntegration).not.toHaveBeenCalled();
    });

    it('requires a new static OAuth client before changing the URL', async () => {
      renderDialog(staticOAuth);

      changeServerUrl('https://neu.stadt.de/mcp');
      expect(
        screen.getByTestId('integration-server-url-change-notice'),
      ).toBeTruthy();
      submit();

      expect(
        await screen.findByText(
          'integrations.serverUrlChange.oauthClientRequired',
        ),
      ).toBeTruthy();
      expect(mocks.updateIntegration).not.toHaveBeenCalled();
    });

    it('sends the URL together with the new static OAuth client', async () => {
      renderDialog(staticOAuth);

      changeServerUrl('https://neu.stadt.de/mcp');
      fireEvent.change(screen.getByLabelText('integrations.oauth.clientId'), {
        target: { value: 'new-client' },
      });
      submit();

      await waitFor(() =>
        expect(mocks.updateIntegration).toHaveBeenCalledWith(staticOAuth.id, {
          serverUrl: 'https://neu.stadt.de/mcp',
          oauthClient: { clientId: 'new-client' },
        }),
      );
    });

    it('hides the URL of marketplace integrations with a fixed URL', () => {
      renderDialog({
        ...marketplace,
        serverUrl: undefined,
        customerProvidesServerUrl: false,
      });

      expect(screen.queryByTestId('integration-edit-server-url')).toBeNull();
    });
  });

  it('requires a new static OAuth client before changing a custom URL', async () => {
    render(
      <EditIntegrationDialog
        integration={{
          ...integration,
          configSchema: {
            authType: 'OAUTH',
            orgFields: [],
            userFields: [],
            oauth: { clientRegistration: 'static', scopes: [] },
          },
          orgConfigValues: {},
        }}
        open
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId('integration-edit-server-url'), {
      target: { value: 'https://new.example.com/mcp' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'integrations.editDialog.update' }),
    );

    expect(
      await screen.findByText(
        'integrations.serverUrlChange.oauthClientRequired',
      ),
    ).toBeTruthy();
    expect(mocks.updateIntegration).not.toHaveBeenCalled();
  });
});
