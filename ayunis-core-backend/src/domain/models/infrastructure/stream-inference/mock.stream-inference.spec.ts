import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { MockStreamInferenceHandler } from './mock.stream-inference';

const model = new LanguageModel({
  name: 'claude-sonnet-4-6',
  provider: ModelProvider.BEDROCK,
  displayName: 'Claude Sonnet 4.6',
  canStream: true,
  canUseTools: true,
  isReasoning: false,
  canVision: true,
  isArchived: false,
});

const sourceId = '123e4567-e89b-12d3-a456-426614174001';
const chunkId = '123e4567-e89b-12d3-a456-426614174002';

const request: ProviderRequest = {
  instructions: '',
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'E2E trigger malformed completed tool call',
        },
      ],
    },
  ],
  tools: [],
};

async function collect(stream: AsyncIterable<ProviderChunk>) {
  const chunks: ProviderChunk[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
}

describe('MockStreamInferenceHandler runtime provider', () => {
  it('recovers on the next model attempt after a malformed tool call', async () => {
    const provider = new MockStreamInferenceHandler().resolveProvider(model);

    const malformed = await collect(provider.stream(request));
    const recovered = await collect(provider.stream(request));

    expect(malformed).toEqual([
      {
        toolCallDeltas: [
          {
            index: 0,
            id: 'mock-malformed-call',
            name: 'create_document',
            argumentsDelta: '{"title":"Unvollständiger Bericht"',
          },
        ],
      },
      {
        finishReason: 'stop',
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    ]);
    expect(recovered.map((chunk) => chunk.textDelta).join('')).toBe(
      'recovered::bedrock::claude-sonnet-4-6',
    );
    expect(recovered.at(-1)?.usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
    });
  });

  it('requests the first available source for the citation E2E trigger', async () => {
    const provider = new MockStreamInferenceHandler().resolveProvider(model);
    const citationRequest: ProviderRequest = {
      ...request,
      instructions: `<available_files><file id="${sourceId}" name="Mobility plan.txt" /></available_files>`,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'E2E cite first source' }],
        },
      ],
      tools: [
        {
          name: 'source_query',
          description: 'Search a source',
          parameters: {
            type: 'object',
            properties: {
              sourceId: { type: 'string', enum: [sourceId] },
              query: { type: 'string' },
            },
          },
        },
      ],
    };

    const response = await collect(provider.stream(citationRequest));

    expect(response).toEqual([
      {
        toolCallDeltas: [
          {
            index: 0,
            id: 'mock-source-citation-call',
            name: 'source_query',
            argumentsDelta: JSON.stringify({
              sourceId,
              query: 'source citation evidence',
            }),
          },
        ],
        finishReason: 'tool_calls',
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    ]);
  });

  it('activates the first available skill when it is the only source context', async () => {
    const provider = new MockStreamInferenceHandler().resolveProvider(model);
    const citationRequest: ProviderRequest = {
      ...request,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'E2E cite first source' }],
        },
      ],
      tools: [
        {
          name: 'activate_skill',
          description: 'Activate a skill',
          parameters: {
            type: 'object',
            properties: {
              skill_slug: { type: 'string', enum: ['user__citation-skill'] },
            },
          },
        },
      ],
    };

    const response = await collect(provider.stream(citationRequest));

    expect(response).toEqual([
      {
        toolCallDeltas: [
          {
            index: 0,
            id: 'mock-source-citation-call',
            name: 'activate_skill',
            argumentsDelta: JSON.stringify({
              skill_slug: 'user__citation-skill',
            }),
          },
        ],
        finishReason: 'tool_calls',
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    ]);
  });

  it('queries the first available knowledge base for the citation E2E trigger', async () => {
    const provider = new MockStreamInferenceHandler().resolveProvider(model);
    const knowledgeBaseId = '123e4567-e89b-12d3-a456-426614174003';
    const citationRequest: ProviderRequest = {
      ...request,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'E2E cite first source' }],
        },
      ],
      tools: [
        {
          name: 'knowledge_query',
          description: 'Search a knowledge base',
          parameters: {
            type: 'object',
            properties: {
              knowledgeBaseId: {
                type: 'string',
                enum: [knowledgeBaseId],
              },
              query: { type: 'string' },
            },
          },
        },
      ],
    };

    const response = await collect(provider.stream(citationRequest));

    expect(response).toEqual([
      {
        toolCallDeltas: [
          {
            index: 0,
            id: 'mock-source-citation-call',
            name: 'knowledge_query',
            argumentsDelta: JSON.stringify({
              knowledgeBaseId,
              query: 'source citation evidence',
            }),
          },
        ],
        finishReason: 'tool_calls',
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    ]);
  });

  it('cites the returned chunk for the citation E2E trigger', async () => {
    const provider = new MockStreamInferenceHandler().resolveProvider(model);
    const citationResultRequest: ProviderRequest = {
      ...request,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'E2E cite first source' }],
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'mock-source-citation-call',
              name: 'source_query',
              input: { sourceId, query: 'source citation evidence' },
            },
          ],
        },
        {
          role: 'tool_result',
          content: [
            {
              type: 'tool_result',
              toolCallId: 'mock-source-citation-call',
              toolName: 'source_query',
              result: JSON.stringify([
                {
                  chunkId,
                  sourceId,
                  sourceName: 'Mobility plan.txt',
                  citable: true,
                  content: 'The council approved the mobility plan.',
                },
              ]),
            },
          ],
        },
      ],
      tools: [],
    };

    const response = await collect(provider.stream(citationResultRequest));

    expect(response.map((chunk) => chunk.textDelta).join('')).toBe(
      `The council approved the mobility plan. {{source:${chunkId}|Mobility plan.txt}}`,
    );
  });

  it('cites a chunk returned by knowledge-base retrieval', async () => {
    const provider = new MockStreamInferenceHandler().resolveProvider(model);
    const citationResultRequest: ProviderRequest = {
      ...request,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'E2E cite first source' }],
        },
        {
          role: 'tool_result',
          content: [
            {
              type: 'tool_result',
              toolCallId: 'mock-source-citation-call',
              toolName: 'knowledge_query',
              result: JSON.stringify([
                {
                  chunkId,
                  documentName: 'Mobility plan.txt',
                  citable: true,
                  content: 'The council approved the mobility plan.',
                },
              ]),
            },
          ],
        },
      ],
      tools: [],
    };

    const response = await collect(provider.stream(citationResultRequest));

    expect(response.map((chunk) => chunk.textDelta).join('')).toBe(
      `The council approved the mobility plan. {{source:${chunkId}|Mobility plan.txt}}`,
    );
  });

  it('echoes a requested chat name in the runtime response', async () => {
    const provider = new MockStreamInferenceHandler().resolveProvider(model);
    const namingRequest: ProviderRequest = {
      ...request,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Name this chat {{legal:DE/BGB/sec_433/par_2}}',
            },
          ],
        },
      ],
    };

    const response = await collect(provider.stream(namingRequest));

    expect(response.map((chunk) => chunk.textDelta).join('')).toBe(
      "I'll name this chat {{legal:DE/BGB/sec_433/par_2}}. You're talking to bedrock::claude-sonnet-4-6",
    );
    expect(response.at(-1)?.usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
    });
  });

  it('requests every document and website in the paginated research scenario', async () => {
    const provider = new MockStreamInferenceHandler().resolveProvider(model);
    const researchRequest: ProviderRequest = {
      ...request,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'E2E trigger paginated research: ' +
                JSON.stringify({
                  documentIds: ['document-1', 'document-2', 'document-3'],
                  urls: [
                    'http://127.0.0.1:3198/one',
                    'http://127.0.0.1:3198/two',
                    'http://127.0.0.1:3198/three',
                  ],
                }),
            },
          ],
        },
      ],
    };

    const response = await collect(provider.stream(researchRequest));
    const calls = response.flatMap((chunk) => chunk.toolCallDeltas ?? []);

    expect(calls.map((call) => call.name)).toEqual([
      'read_document',
      'read_document',
      'read_document',
      'website_content',
      'website_content',
      'website_content',
    ]);
    expect(response.at(-1)).toMatchObject({
      finishReason: 'tool_calls',
      usage: { inputTokens: 0, outputTokens: 0 },
    });
  });

  it('returns an answer when paginated research is retried after thinking only', async () => {
    const provider = new MockStreamInferenceHandler().resolveProvider(model);
    const researchRequest: ProviderRequest = {
      ...request,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'E2E trigger paginated research: {"documentIds":[],"urls":[]}',
            },
          ],
        },
        {
          role: 'tool_result',
          content: [
            {
              type: 'tool_result',
              toolCallId: 'document-0',
              toolName: 'read_document',
              result: '{"truncated":true}',
            },
          ],
        },
      ],
    };

    const firstResponse = await collect(provider.stream(researchRequest));
    const recoveredResponse = await collect(provider.stream(researchRequest));

    expect(firstResponse.map((chunk) => chunk.textDelta).join('')).toBe('');
    expect(firstResponse.map((chunk) => chunk.thinkingDelta).join('')).toBe(
      'I have enough research to answer.',
    );
    expect(recoveredResponse.map((chunk) => chunk.textDelta).join('')).toBe(
      'research-complete::bedrock::claude-sonnet-4-6',
    );
    expect(recoveredResponse.at(-1)?.usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
    });
  });

  describe('MCP approval scenario', () => {
    const approvalRequest = (
      messages: ProviderRequest['messages'],
    ): ProviderRequest => ({
      instructions: '',
      messages,
      tools: [
        { name: 'create_document', description: '', parameters: {} },
        {
          name: 'mcp__tool__create_document__b0eb63cb',
          description: '',
          parameters: {},
        },
      ],
    });
    const userTurn = {
      role: 'user' as const,
      content: [
        { type: 'text' as const, text: 'E2E trigger mcp approval: Notes' },
      ],
    };

    it('calls the namespaced integration tool while the built-in is also offered', async () => {
      const provider = new MockStreamInferenceHandler().resolveProvider(model);

      const chunks = await collect(
        provider.stream(approvalRequest([userTurn])),
      );

      expect(chunks[0].toolCallDeltas).toEqual([
        {
          index: 0,
          id: 'mock-mcp-approval-call',
          name: 'mcp__tool__create_document__b0eb63cb',
          argumentsDelta: '{"title":"Notes"}',
        },
      ]);
      expect(chunks.at(-1)?.finishReason).toBe('tool_calls');
    });

    it('echoes the tool result once the call was settled', async () => {
      const provider = new MockStreamInferenceHandler().resolveProvider(model);

      const chunks = await collect(
        provider.stream(
          approvalRequest([
            userTurn,
            {
              role: 'tool_result',
              content: [
                {
                  type: 'tool_result',
                  toolCallId: 'mock-mcp-approval-call',
                  toolName: 'mcp__tool__create_document__b0eb63cb',
                  result: 'stub create_document ok',
                },
              ],
            },
          ]),
        ),
      );

      expect(chunks.map((chunk) => chunk.textDelta ?? '').join('')).toBe(
        'mcp-approval-complete::stub create_document ok',
      );
    });
  });
});
