import type { ModelProvider, ProviderChunk } from '@ayunis/inference';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { accumulateResponse } from 'src/domain/models/application/helpers/accumulate-response.helper';
import type { Model } from 'src/domain/models/domain/model.entity';
import { ThinkingTagInferenceProviderFactory } from './thinking-tag-inference-provider.factory';

class TestFactory extends ThinkingTagInferenceProviderFactory {
  constructor(private readonly chunks: ProviderChunk[]) {
    super();
  }
  protected createProvider(): ModelProvider {
    const chunks = this.chunks;
    return {
      name: 'test:think-tags',
      async *stream() {
        for (const chunk of chunks) yield chunk;
      },
    };
  }
}

const model = {
  id: '00000000-0000-4000-8000-000000000001',
  updatedAt: new Date('2026-01-01T00:00:00Z'),
} as unknown as Model;

describe('ThinkingTagInferenceProviderFactory', () => {
  it('splits inline <think> reasoning out of the resolved provider stream', async () => {
    const provider = new TestFactory([
      { textDelta: '<think>reasoning</think>' },
      { textDelta: 'the answer' },
      { finishReason: 'stop' },
    ]).resolveProvider(model);

    const response = await accumulateResponse(
      provider.stream({ instructions: '', messages: [], tools: [] }),
    );

    const thinking = response.content.find(
      (c): c is ThinkingMessageContent => c instanceof ThinkingMessageContent,
    );
    const text = response.content.find(
      (c): c is TextMessageContent => c instanceof TextMessageContent,
    );
    expect(thinking?.thinking).toBe('reasoning');
    expect(text?.text).toBe('the answer');
  });
});
