import { randomUUID } from 'crypto';
import { CustomMcpIntegration } from './custom-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from '../auth/no-auth-mcp-integration-auth.entity';

describe('CustomMcpIntegration', () => {
  it('exposes schema-defined organization and user credentials', () => {
    const auth = new NoAuthMcpIntegrationAuth();
    const integration = new CustomMcpIntegration({
      name: 'Custom Integration',
      orgId: randomUUID(),
      serverUrl: 'https://initial.example.com/mcp',
      auth,
      configSchema: {
        authType: 'CUSTOM',
        orgFields: [
          {
            key: 'tenantId',
            label: 'Tenant ID',
            type: 'text',
            headerName: 'X-Tenant-ID',
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
          },
        ],
      },
      orgConfigValues: { tenantId: 'council-42' },
    });

    expect(integration.orgConfigValues).toEqual({ tenantId: 'council-42' });
    expect(integration.requiresUserAuthorization).toBe(true);
    expect(integration.isUserAuthorized(null)).toBe(false);
    expect(
      integration.isUserAuthorized({ personalToken: 'encrypted-token' }),
    ).toBe(true);
    expect(integration.auth).toBe(auth);
  });
});
