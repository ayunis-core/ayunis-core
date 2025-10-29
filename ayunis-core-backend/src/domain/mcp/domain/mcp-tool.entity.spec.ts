import { McpTool } from './mcp-tool.entity';

describe('McpTool', () => {
  it('should instantiate correctly with all fields', () => {
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
      'integration-123',
    );

    expect(tool.name).toBe('search');
    expect(tool.description).toBe('Search for information');
    expect(tool.inputSchema).toEqual(inputSchema);
    expect(tool.integrationId).toBe('integration-123');
  });

  it('should handle optional description', () => {
    const tool = new McpTool(
      'test-tool',
      undefined,
      { type: 'object' },
      'integration-456',
    );

    expect(tool.name).toBe('test-tool');
    expect(tool.description).toBeUndefined();
    expect(tool.integrationId).toBe('integration-456');
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
      'integration-789',
    );

    expect(tool.inputSchema).toEqual(complexSchema);
    expect((tool.inputSchema as any).properties.name.description).toBe(
      'The name parameter',
    );
  });
});
