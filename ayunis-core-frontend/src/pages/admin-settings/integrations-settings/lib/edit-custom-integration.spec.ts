import { describe, expect, it } from 'vitest';
import type { McpIntegration } from '@/pages/admin-settings/integrations-settings/model/types';
import {
  buildCustomIntegrationUpdatePayload,
  toEditCustomIntegrationFormData,
} from './edit-custom-integration';

const integration = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Document archive',
  type: 'custom',
  serverUrl: 'https://old.example.com/mcp',
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
        headerName: 'X-Old-Token',
        required: true,
      },
      {
        key: 'tenantUrl',
        label: 'Tenant URL',
        type: 'url',
        headerName: 'X-Tenant-Url',
        required: true,
      },
    ],
    userFields: [],
  },
  orgConfigValues: {
    apiToken: '••••••',
    tenantUrl: 'https://tenant.example.com',
  },
} as McpIntegration;

describe('custom integration edit mapping', () => {
  it('prefills the server URL and non-secret values while masking secrets', () => {
    const formData = toEditCustomIntegrationFormData(integration);

    expect(formData.serverUrl).toBe('https://old.example.com/mcp');
    expect(formData.fields).toEqual([
      expect.objectContaining({
        key: 'apiToken',
        headerName: 'X-Old-Token',
        value: '',
      }),
      expect.objectContaining({
        key: 'tenantUrl',
        value: 'https://tenant.example.com',
      }),
    ]);
  });

  it('sends changed URL and header definitions without the unchanged secret', () => {
    const formData = toEditCustomIntegrationFormData(integration);
    formData.serverUrl = ' https://new.example.com/mcp ';
    formData.fields[0].headerName = 'Authorization';
    formData.fields[0].prefix = 'Bearer ';

    expect(buildCustomIntegrationUpdatePayload(formData, integration)).toEqual(
      expect.objectContaining({
        serverUrl: 'https://new.example.com/mcp',
        configSchema: expect.objectContaining({
          orgFields: [
            expect.objectContaining({
              key: 'apiToken',
              headerName: 'Authorization',
              prefix: 'Bearer ',
            }),
            expect.objectContaining({ key: 'tenantUrl' }),
          ],
        }),
      }),
    );
    expect(
      buildCustomIntegrationUpdatePayload(formData, integration),
    ).not.toHaveProperty('orgConfigValues');
  });

  it('sends only the name for a rename-only edit', () => {
    const formData = toEditCustomIntegrationFormData(integration);
    formData.name = 'Renamed document archive';

    expect(buildCustomIntegrationUpdatePayload(formData, integration)).toEqual({
      name: 'Renamed document archive',
    });
  });

  it('builds an empty payload when the form is unchanged', () => {
    const formData = toEditCustomIntegrationFormData(integration);

    expect(buildCustomIntegrationUpdatePayload(formData, integration)).toEqual(
      {},
    );
  });

  it('builds an empty payload for an unchanged OAuth schema with no scopes', () => {
    const oauthIntegration = {
      ...integration,
      configSchema: {
        authType: 'OAUTH',
        orgFields: [],
        userFields: [],
        oauth: {
          clientRegistration: 'automatic',
          scopes: [],
        },
      },
      orgConfigValues: {},
    } as McpIntegration;
    const formData = toEditCustomIntegrationFormData(oauthIntegration);

    expect(
      buildCustomIntegrationUpdatePayload(formData, oauthIntegration),
    ).toEqual({});
  });
});
