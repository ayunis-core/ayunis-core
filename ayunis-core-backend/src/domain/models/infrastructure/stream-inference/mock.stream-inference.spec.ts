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
    expect(response.at(-1)?.finishReason).toBe('tool_calls');
  });

  it('completes the paginated research scenario after tool results return', async () => {
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

    const response = await collect(provider.stream(researchRequest));

    expect(response.map((chunk) => chunk.textDelta).join('')).toBe(
      'research-complete::bedrock::claude-sonnet-4-6',
    );
  });
});
