import { randomUUID } from 'crypto';
import { McpResource } from 'src/domain/mcp/domain/mcp-resource.entity';
import { McpIntegrationResource } from './mcp-integration-resource.entity';

describe('McpIntegrationResource', () => {
  it('sanitizes the human-readable resource name into a valid tool name', () => {
    const resource = new McpResource({
      uri: 'file:///docs/readme.md',
      name: 'Project README',
      description: 'The project readme',
      mimeType: 'text/markdown',
      integrationId: randomUUID(),
    });

    const tool = new McpIntegrationResource(resource, false);

    expect(tool.name).toBe('Project_README');
    expect(tool.description).toContain('Project README');
  });
});
