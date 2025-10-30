import { randomUUID } from 'crypto';
import { McpTool } from './mcp-tool.entity';

describe('McpTool', () => {
  it('should instantiate correctly with all fields', () => {
    const integrationId = randomUUID();
    const inputSchema = {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    };

    const tool = new McpTool(
      'search',
      'Search for information',
      inputSchema,
      integrationId,
    );

    expect(tool.name).toBe('search');
    expect(tool.description).toBe('Search for information');
    expect(tool.inputSchema).toEqual(inputSchema);
    expect(tool.integrationId).toBe(integrationId);
  });

  it('should handle optional description', () => {
    const integrationId = randomUUID();
    const tool = new McpTool(
      'test-tool',
      undefined,
      { type: 'object' },
      integrationId,
    );

    expect(tool.name).toBe('test-tool');
    expect(tool.description).toBeUndefined();
    expect(tool.integrationId).toBe(integrationId);
  });

  it('should handle complex input schema', () => {
    const complexSchema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name parameter',
        },
        count: {
          type: 'number',
          minimum: 0,
          maximum: 100,
        },
        options: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['name'],
    };

    const tool = new McpTool(
      'complex-tool',
      'A tool with complex schema',
      complexSchema,
      randomUUID(),
    );

    expect(tool.inputSchema).toEqual(complexSchema);
    expect((tool.inputSchema as any).properties.name.description).toBe(
      'The name parameter',
    );
  });
});
