import type { ModelProvider, ProviderChunk } from '@ayunis/inference';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { accumulateResponse } from './response-accumulator';
import { applyChunkTransform } from './chunk-transform';
import { ThinkingTagInferenceHandler } from './thinking-tag-inference.handler';

class TestHandler extends ThinkingTagInferenceHandler {
  constructor() {
    super({} as ImageContentService);
  }
  protected createProvider(): ModelProvider {
    throw new Error('not used in this test');
  }
  public transform() {
    return this.createChunkTransform();
  }
}

async function* stream(chunks: ProviderChunk[]): AsyncIterable<ProviderChunk> {
  for (const chunk of chunks) yield chunk;
}

describe('ThinkingTagInferenceHandler', () => {
  // Non-streaming must split <think> reasoning the same way streaming does.
  it('splits inline <think> reasoning in the accumulated response', async () => {
    const transform = new TestHandler().transform();
    const response = await accumulateResponse(
      applyChunkTransform(
        stream([
          { textDelta: '<think>reasoning</think>' },
          { textDelta: 'the answer' },
          { finishReason: 'stop' },
        ]),
        transform,
      ),
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
