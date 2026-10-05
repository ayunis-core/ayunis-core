import { randomUUID } from 'crypto';
import { McpResource } from 'src/domain/mcp/domain/mcp-resource.entity';
import { McpIntegrationResource } from './mcp-integration-resource.entity';

describe('McpIntegrationResource', () => {
  it('namespaces the model-visible resource name by integration', () => {
    const integrationId = randomUUID();
    const resource = new McpResource({
      uri: 'file:///docs/readme.md',
      name: 'Project README',
      description: 'The project readme',
      mimeType: 'text/markdown',
      integrationId,
    });

    const tool = new McpIntegrationResource(
      resource,
      false,
      'Municipal Documents',
      'https://cdn.example.com/municipal-documents.svg',
    );

    expect(tool.name).toBe(
      `mcp__resource__Project README__${integrationId.slice(0, 8)}`,
    );
    expect(tool.description).toContain('Project README');
    expect(tool.description).toContain('Municipal Documents');
    expect(tool.integrationName).toBe('Municipal Documents');
    expect(tool.integrationLogoUrl).toBe(
      'https://cdn.example.com/municipal-documents.svg',
    );
  });
});
