import { PredefinedMcpIntegration } from './predefined-mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../value-objects/predefined-mcp-integration-slug.enum';
import { BearerMcpIntegrationAuth } from '../auth/bearer-mcp-integration-auth.entity';

describe('PredefinedMcpIntegration', () => {
  it('should expose slug and immutable server url', () => {
    const integration = new PredefinedMcpIntegration({
      name: 'Predefined',
      orgId: 'org-123',
      slug: PredefinedMcpIntegrationSlug.TEST,
      serverUrl: 'https://registry.example.com/mcp',
      auth: new BearerMcpIntegrationAuth(),
    });

    expect(integration.slug).toBe(PredefinedMcpIntegrationSlug.TEST);
    expect(integration.serverUrl).toBe('https://registry.example.com/mcp');
  });
});
