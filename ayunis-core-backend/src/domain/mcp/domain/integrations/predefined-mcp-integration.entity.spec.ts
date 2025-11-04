import { randomUUID } from 'crypto';
import { PredefinedMcpIntegration } from './predefined-mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../value-objects/predefined-mcp-integration-slug.enum';
import { BearerMcpIntegrationAuth } from '../auth/bearer-mcp-integration-auth.entity';

describe('PredefinedMcpIntegration', () => {
  it('should expose slug and immutable server url', () => {
    const integration = new PredefinedMcpIntegration({
      name: 'Predefined',
      orgId: randomUUID(),
      slug: PredefinedMcpIntegrationSlug.TEST,
      serverUrl: 'https://registry.example.com/mcp',
      auth: new BearerMcpIntegrationAuth({ authToken: 'token' }),
    });

    expect(integration.slug).toBe(PredefinedMcpIntegrationSlug.TEST);
    expect(integration.serverUrl).toBe('https://registry.example.com/mcp');
  });
});
