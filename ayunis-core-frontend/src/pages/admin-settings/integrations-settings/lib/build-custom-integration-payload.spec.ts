import { describe, expect, it } from 'vitest';
import { buildCustomIntegrationPayload } from './build-custom-integration-payload';

describe('buildCustomIntegrationPayload', () => {
  it('splits organization and user fields and only submits organization values', () => {
    const payload = buildCustomIntegrationPayload({
      name: ' Records ',
      serverUrl: ' https://records.example.com/mcp ',
      fields: [
        {
          key: 'tenant',
          scope: 'organization',
          label: ' Tenant ',
          type: 'text',
          headerName: ' X-Tenant ',
          prefix: '',
          required: true,
          help: '',
          value: 'council-42',
        },
        {
          key: 'personalToken',
          scope: 'user',
          label: 'Personal token',
          type: 'secret',
          headerName: 'Authorization',
          prefix: 'Bearer ',
          required: true,
          help: 'Create a token in your profile.',
          value: '',
        },
      ],
    });

    expect(payload).toEqual({
      name: 'Records',
      serverUrl: 'https://records.example.com/mcp',
      configSchema: {
        orgFields: [
          {
            key: 'tenant',
            label: 'Tenant',
            type: 'text',
            headerName: 'X-Tenant',
            required: true,
          },
        ],
        userFields: [
          {
            key: 'personalToken',
            label: 'Personal token',
            type: 'secret',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
            help: 'Create a token in your profile.',
          },
        ],
      },
      orgConfigValues: { tenant: 'council-42' },
    });
  });
});
