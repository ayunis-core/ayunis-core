import { randomUUID } from 'crypto';
import type { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { MapMessagesToInferenceUseCase } from 'src/domain/models/application/use-cases/map-messages-to-inference/map-messages-to-inference.use-case';
import { RunContextBudgetExceededError } from '../runs.errors';
import { CompleteTurnSelector } from './complete-turn-selector';
import { RuntimeHistoryMaterializer } from './runtime-history-materializer';

describe('RuntimeHistoryMaterializer', () => {
  it('loads only images in retained turns and materializes them once', async () => {
    const threadId = randomUUID();
    const discarded = new UserMessage({
      threadId,
      content: [
        new TextMessageContent('old question'),
        new ImageMessageContent(0, 'image/png'),
      ],
    });
    const retained = new UserMessage({
      threadId,
      content: [
        new TextMessageContent('new question'),
        new ImageMessageContent(0, 'image/jpeg'),
      ],
    });
    const messages = [
      discarded,
      new AssistantMessage({
        threadId,
        content: [new TextMessageContent('old answer')],
      }),
      retained,
    ];
    const convertImageToBase64 = jest.fn().mockResolvedValue({
      base64: 'retained-image',
      contentType: 'image/jpeg',
    });
    const materializer = buildMaterializer(30, convertImageToBase64);

    const result = await materializer.materialize({
      messages,
      orgId: randomUUID(),
      tools: [],
      maxTokens: 50,
    });

    expect(result).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'new question' },
          { type: 'text', text: `[image ref: ${retained.id}:0]` },
          {
            type: 'image',
            data: 'retained-image',
            mediaType: 'image/jpeg',
          },
        ],
      },
    ]);
    expect(convertImageToBase64).toHaveBeenCalledTimes(1);
    expect(convertImageToBase64).toHaveBeenCalledWith(
      retained.content[1],
      expect.objectContaining({ messageId: retained.id }),
    );
    expect(messages).toHaveLength(3);
  });

  it('rejects an oversized newest turn before loading its image', async () => {
    const threadId = randomUUID();
    const messages = [
      new UserMessage({
        threadId,
        content: [
          new TextMessageContent('oversized question'),
          new ImageMessageContent(0, 'image/png'),
        ],
      }),
    ];
    const convertImageToBase64 = jest.fn();
    const materializer = buildMaterializer(80_001, convertImageToBase64);

    await expect(
      materializer.materialize({
        messages,
        orgId: randomUUID(),
        tools: [],
        maxTokens: 80_000,
      }),
    ).rejects.toBeInstanceOf(RunContextBudgetExceededError);
    expect(convertImageToBase64).not.toHaveBeenCalled();
  });
});

function buildMaterializer(
  tokensPerContent: number,
  convertImageToBase64: jest.Mock,
): RuntimeHistoryMaterializer {
  const selector = new CompleteTurnSelector({
    execute: jest.fn().mockReturnValue(tokensPerContent),
  } as unknown as CountTokensUseCase);
  const mapper = new MapMessagesToInferenceUseCase({
    convertImageToBase64,
  } as unknown as ImageContentService);
  return new RuntimeHistoryMaterializer(selector, mapper);
}
