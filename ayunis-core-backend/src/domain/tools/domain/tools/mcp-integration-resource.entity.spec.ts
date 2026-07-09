import { randomUUID } from 'crypto';
import { McpResource } from 'src/domain/mcp/domain/mcp-resource.entity';
import { McpIntegrationResource } from './mcp-integration-resource.entity';

describe('McpIntegrationResource', () => {
  it('keeps the human-readable resource name — providers translate on the wire', () => {
    const resource = new McpResource({
      uri: 'file:///docs/readme.md',
      name: 'Project README',
      description: 'The project readme',
      mimeType: 'text/markdown',
      integrationId: randomUUID(),
    });

    const tool = new McpIntegrationResource(resource, false);

    expect(tool.name).toBe('Project README');
    expect(tool.description).toContain('Project README');
  });
});
