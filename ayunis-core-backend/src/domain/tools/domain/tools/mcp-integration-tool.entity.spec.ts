import { randomUUID } from 'crypto';
import { McpTool } from 'src/domain/mcp/domain/mcp-tool.entity';
import { McpIntegrationTool } from './mcp-integration-tool.entity';

describe('McpIntegrationTool', () => {
  function createTool(
    name: string,
    integrationId = randomUUID(),
    integrationName = 'Integration',
  ): McpIntegrationTool {
    const mcpTool = new McpTool(
      name,
      'A tool',
      { type: 'object', properties: {} },
      integrationId,
    );
    return new McpIntegrationTool(mcpTool, false, integrationName, null);
  }

  it('namespaces the model-visible name and preserves the upstream name', () => {
    const integrationId = randomUUID();
    const tool = createTool('Project README.fetch', integrationId);

    expect(tool.name).toBe(
      `mcp__tool__Project README.fetch__${integrationId.slice(0, 8)}`,
    );
    expect(tool.originalName).toBe('Project README.fetch');
  });

  it('identifies the integration in the model-visible description', () => {
    const tool = createTool(
      'create_document',
      randomUUID(),
      'Outline Bremerhaven',
    );

    expect(tool.description).toContain('Outline Bremerhaven');
    expect(tool.description).toContain('create_document');
  });

  it('keeps canonical names within the 64-character provider limit for upstream names up to 43 characters', () => {
    const tool = createTool('a'.repeat(43));

    expect(tool.name).toHaveLength(64);
  });

  it('requires approval unless the server marks the tool read-only', () => {
    const integrationId = randomUUID();
    const writeTool = new McpIntegrationTool(
      new McpTool(
        'create_document',
        undefined,
        { type: 'object' },
        integrationId,
      ),
      false,
      'Outline',
      null,
    );
    const readTool = new McpIntegrationTool(
      new McpTool('search', undefined, { type: 'object' }, integrationId, {
        readOnlyHint: true,
      }),
      false,
      'Outline',
      null,
    );

    expect(writeTool.requiresApproval).toBe(true);
    expect(writeTool.description).toContain('must approve');
    expect(readTool.requiresApproval).toBe(false);
    expect(readTool.description).not.toContain('must approve');
  });

  it('keeps the canonical name stable when the integration is renamed', () => {
    const integrationId = randomUUID();

    expect(createTool('create_document', integrationId, 'Outline').name).toBe(
      createTool('create_document', integrationId, 'Municipal Wiki').name,
    );
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

    it('reports every violation in plain language, matching the shared validator', () => {
      const mcpTool = new McpTool(
        'create_ticket',
        'Creates a ticket in the connected system',
        {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            priority: { type: 'string' },
          },
          required: ['summary', 'priority'],
        },
        randomUUID(),
      );
      const tool = new McpIntegrationTool(mcpTool, false, 'Integration', null);
      expect(() => tool.validateParams({})).toThrow(
        /missing required parameter 'summary'.*missing required parameter 'priority'/,
      );
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
