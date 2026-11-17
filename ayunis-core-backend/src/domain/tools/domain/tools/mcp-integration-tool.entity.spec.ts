import { randomUUID } from 'crypto';
import { McpTool } from 'src/domain/mcp/domain/mcp-tool.entity';
import { McpIntegrationTool } from './mcp-integration-tool.entity';
import { InvalidMcpFileParamsError } from 'src/domain/tools/domain/value-objects/mcp-file-fields';

const FILE_OBJECT_SCHEMA = {
  type: 'object',
  properties: {
    download_url: { type: 'string' },
    file_id: { type: 'string' },
  },
  required: ['download_url', 'file_id'],
};

function createFileTool(
  inputSchema: Record<string, unknown>,
  fileParams: string[],
): McpIntegrationTool {
  return new McpIntegrationTool(
    new McpTool('start_pdf', 'Starts a job', inputSchema, randomUUID(), [
      ...fileParams,
    ]),
    false,
    'Accessful',
    null,
  );
}

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

  it('keeps the canonical name stable when the integration is renamed', () => {
    const integrationId = randomUUID();

    expect(createTool('create_document', integrationId, 'Outline').name).toBe(
      createTool('create_document', integrationId, 'Municipal Wiki').name,
    );
  });

  describe('file params', () => {
    it('shows the model a source ID instead of a single file object, keeping it required', () => {
      const tool = createFileTool(
        {
          type: 'object',
          properties: { file: FILE_OBJECT_SCHEMA, title: { type: 'string' } },
          required: ['file'],
        },
        ['file'],
      );

      expect(tool.parameters).toEqual({
        type: 'object',
        properties: {
          file: {
            type: 'string',
            description: 'The ID of a file attached to this chat.',
          },
          title: { type: 'string' },
        },
        required: ['file'],
      });
      expect(tool.fileFields).toEqual([{ name: 'file', kind: 'single' }]);
      expect(tool.validateParams({ file: 'source-1' })).toEqual({
        file: 'source-1',
      });
      expect(() => tool.validateParams({ title: 'Report' })).toThrow(
        /missing required parameter 'file'/,
      );
    });

    it('shows the model a list of source IDs for an optional array of file objects behind local $refs', () => {
      const tool = createFileTool(
        {
          type: 'object',
          properties: { attachments: { $ref: '#/$defs/Attachments' } },
          $defs: {
            Attachments: {
              type: 'array',
              items: { $ref: '#/$defs/File' },
            },
            File: FILE_OBJECT_SCHEMA,
          },
        },
        ['attachments'],
      );

      expect(tool.parameters).toMatchObject({
        properties: {
          attachments: {
            type: 'array',
            items: {
              type: 'string',
              description: 'The ID of a file attached to this chat.',
            },
          },
        },
      });
      expect(tool.parameters).not.toHaveProperty('required');
      expect(tool.fileFields).toEqual([{ name: 'attachments', kind: 'list' }]);
      expect(() => tool.validateParams({ attachments: [{}] })).toThrow();
    });

    it('leaves the schema of a tool without file params untouched', () => {
      const inputSchema = {
        type: 'object',
        properties: { file: FILE_OBJECT_SCHEMA },
      };

      const tool = createFileTool(inputSchema, []);

      expect(tool.parameters).toBe(inputSchema);
      expect(tool.fileFields).toEqual([]);
    });

    it.each([
      ['a field missing from the schema', { type: 'object', properties: {} }],
      [
        'a string field',
        { type: 'object', properties: { file: { type: 'string' } } },
      ],
      [
        'an array of strings',
        {
          type: 'object',
          properties: { file: { type: 'array', items: { type: 'string' } } },
        },
      ],
      [
        'an unresolvable $ref',
        {
          type: 'object',
          properties: { file: { $ref: '#/$defs/Missing' } },
        },
      ],
      [
        'a $ref cycle',
        {
          type: 'object',
          properties: { file: { $ref: '#/$defs/A' } },
          $defs: { A: { $ref: '#/$defs/A' } },
        },
      ],
    ])(
      'rejects a declaration naming %s, so the model is never asked to build a file object',
      (_case, inputSchema) => {
        expect(() => createFileTool(inputSchema, ['file'])).toThrow(
          InvalidMcpFileParamsError,
        );
      },
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
