import type { ProviderRequest } from '@ayunis/inference';
import type { ToolUseIntegration } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { buildProviderRequestDiagnostics } from './provider-request-diagnostics.helper';

const mcpIntegration: ToolUseIntegration = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Municipal Records',
  logoUrl: null,
};

const request: ProviderRequest = {
  instructions: 'Answer questions for a municipal clerk.',
  messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
  tools: [
    {
      name: 'search_municipal_records',
      description: 'Search records containing confidential field labels',
      parameters: {
        type: 'object',
        properties: {
          confidentialQuery: { type: 'string' },
        },
      },
    },
    {
      name: 'internet_search',
      description: 'Search the public internet',
      parameters: { type: 'object', properties: {} },
    },
  ],
  toolChoice: 'auto',
};

describe('buildProviderRequestDiagnostics', () => {
  it('identifies MCP tools and fingerprints schemas without exposing them', () => {
    const diagnostics = buildProviderRequestDiagnostics(request, {
      get: (toolName) =>
        toolName === 'search_municipal_records' ? mcpIntegration : undefined,
    });

    expect(diagnostics).toMatchObject({
      toolSchemaBytes: expect.any(Number),
      toolSetHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      tools: [
        {
          name: 'search_municipal_records',
          schemaHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          mcpIntegrationId: mcpIntegration.id,
          mcpIntegrationName: mcpIntegration.name,
        },
        {
          name: 'internet_search',
          schemaHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      ],
    });
    expect(JSON.stringify(diagnostics)).not.toContain('confidential field');
    expect(JSON.stringify(diagnostics)).not.toContain('confidentialQuery');
  });

  it('changes the fingerprints when a tool schema changes', () => {
    const original = buildProviderRequestDiagnostics(request);
    const changed = buildProviderRequestDiagnostics({
      ...request,
      tools: request.tools.map((tool, index) =>
        index === 0
          ? { ...tool, parameters: { type: 'object', properties: {} } }
          : tool,
      ),
    });

    expect(changed.toolSetHash).not.toBe(original.toolSetHash);
    expect(changed.tools[0].schemaHash).not.toBe(original.tools[0].schemaHash);
  });
});
