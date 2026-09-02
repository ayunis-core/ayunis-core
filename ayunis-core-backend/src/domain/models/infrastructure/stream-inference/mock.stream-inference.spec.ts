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
});
