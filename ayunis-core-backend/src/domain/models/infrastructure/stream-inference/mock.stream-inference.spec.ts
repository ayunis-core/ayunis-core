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
      { finishReason: 'stop' },
    ]);
    expect(recovered.map((chunk) => chunk.textDelta).join('')).toBe(
      'recovered::bedrock::claude-sonnet-4-6',
    );
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
  });
});
