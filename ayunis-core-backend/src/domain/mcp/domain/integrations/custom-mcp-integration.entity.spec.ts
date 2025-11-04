import { CustomMcpIntegration } from './custom-mcp-integration.entity';
import { CustomHeaderMcpIntegrationAuth } from '../auth/custom-header-mcp-integration-auth.entity';

describe('CustomMcpIntegration', () => {
  it('should update server url and retain auth', () => {
    const auth = new CustomHeaderMcpIntegrationAuth();
    const integration = new CustomMcpIntegration({
      name: 'Custom Integration',
      orgId: 'org-123',
      serverUrl: 'https://initial.example.com/mcp',
      auth,
    });

    expect(integration.serverUrl).toBe('https://initial.example.com/mcp');

    integration.updateServerUrl('https://updated.example.com/mcp');

    expect(integration.serverUrl).toBe('https://updated.example.com/mcp');
    expect(integration.auth).toBe(auth);
  });
});
