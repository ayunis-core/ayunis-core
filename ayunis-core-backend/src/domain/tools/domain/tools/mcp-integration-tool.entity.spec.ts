import { randomUUID } from 'crypto';
import { McpTool } from 'src/domain/mcp/domain/mcp-tool.entity';
import { McpIntegrationTool } from './mcp-integration-tool.entity';

describe('McpIntegrationTool', () => {
  function createTool(name: string): McpIntegrationTool {
    const mcpTool = new McpTool(
      name,
      'A tool',
      { type: 'object', properties: {} },
      randomUUID(),
    );
    return new McpIntegrationTool(mcpTool, false, 'Integration', null);
  }

  it('sanitizes the model-facing name to the provider-accepted pattern', () => {
    const tool = createTool('Project README.fetch');
    expect(tool.name).toBe('Project_README_fetch');
  });

  it('preserves the original MCP tool name for server calls', () => {
    const tool = createTool('Project README.fetch');
    expect(tool.mcpToolName).toBe('Project README.fetch');
  });

  it('keeps valid names identical on both sides', () => {
    const tool = createTool('search_documents');
    expect(tool.name).toBe('search_documents');
    expect(tool.mcpToolName).toBe('search_documents');
  });

  describe('validateParams', () => {
    it('still rejects params that violate a compilable schema', () => {
      const mcpTool = new McpTool(
        'search',
        'A tool',
        {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
        randomUUID(),
      );
      const tool = new McpIntegrationTool(mcpTool, false, 'Integration', null);
      expect(() => tool.validateParams({})).toThrow();
    });

    it('passes params through when the server schema does not compile (draft-04 keywords)', () => {
      const mcpTool = new McpTool(
        'search',
        'A tool',
        {
          type: 'object',
          properties: {
            query: { type: 'string' },
            page: { type: 'integer', minimum: 0, exclusiveMinimum: true },
          },
          required: ['query'],
        },
        randomUUID(),
      );
      const tool = new McpIntegrationTool(mcpTool, false, 'Integration', null);
      expect(tool.validateParams({ query: 'Alpha' })).toEqual({
        query: 'Alpha',
      });
    });
  });
});
