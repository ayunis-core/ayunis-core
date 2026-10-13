import type { TokenEstimator } from '@ayunis/inference';
import { randomUUID } from 'crypto';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { MapMessagesToInferenceUseCase } from 'src/domain/models/application/use-cases/map-messages-to-inference/map-messages-to-inference.use-case';
import { RunContextBudgetExceededError } from 'src/domain/runs/application/runs.errors';
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
    const loadImage = jest.fn().mockResolvedValue({
      buffer: Buffer.from('retained-image'),
      contentType: 'image/jpeg',
    });
    const materializer = buildMaterializer(loadImage);

    const result = await materializer.materialize({
      messages,
      orgId: randomUUID(),
      tools: [],
      request: {
        instructions: '',
        tools: [],
        model: {
          provider: 'anthropic',
          name: 'claude',
          contextWindowSize: 2_000,
        },
        tokens: fixedEstimator(30),
      },
    });

    expect(result).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'new question' },
          { type: 'text', text: `[image ref: ${retained.id}:0]` },
          {
            type: 'image',
            data: Buffer.from('retained-image').toString('base64'),
            mediaType: 'image/jpeg',
          },
        ],
      },
    ]);
    expect(loadImage).toHaveBeenCalledTimes(1);
    expect(loadImage).toHaveBeenCalledWith(
      retained.content[1],
      expect.objectContaining({ messageId: retained.id }),
    );
    expect(messages).toHaveLength(3);
  });

  it('counts images against the budget before loading them', async () => {
    const threadId = randomUUID();
    const withImage = new UserMessage({
      threadId,
      content: [
        new TextMessageContent('old question'),
        new ImageMessageContent(0, 'image/png'),
      ],
    });
    const messages = [
      withImage,
      new AssistantMessage({
        threadId,
        content: [new TextMessageContent('old answer')],
      }),
      new UserMessage({
        threadId,
        content: [new TextMessageContent('new question')],
      }),
    ];
    const loadImage = jest.fn();
    const materializer = buildMaterializer(loadImage);

    const result = await materializer.materialize({
      messages,
      orgId: randomUUID(),
      tools: [],
      request: {
        instructions: '',
        tools: [],
        model: {
          provider: 'anthropic',
          name: 'claude',
          contextWindowSize: 1_112,
        },
        tokens: fixedEstimator(10),
      },
    });

    expect(result).toHaveLength(1);
    expect(loadImage).not.toHaveBeenCalled();
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
    const loadImage = jest.fn();
    const materializer = buildMaterializer(loadImage);

    await expect(
      materializer.materialize({
        messages,
        orgId: randomUUID(),
        tools: [],
        request: {
          instructions: '',
          tools: [],
          model: {
            provider: 'anthropic',
            name: 'claude',
            contextWindowSize: 88_889,
          },
          tokens: fixedEstimator(80_001),
        },
      }),
    ).rejects.toBeInstanceOf(RunContextBudgetExceededError);
    expect(loadImage).not.toHaveBeenCalled();
  });
});

function buildMaterializer(loadImage: jest.Mock): RuntimeHistoryMaterializer {
  const mapper = new MapMessagesToInferenceUseCase({
    loadImage,
  } as unknown as ImageContentService);
  return new RuntimeHistoryMaterializer(mapper);
}

function fixedEstimator(tokensPerContent: number): TokenEstimator {
  return {
    exact: false,
    tokensPerMessage: 0,
    tokensPerImage: 1_600,
    countText: (text) => (text ? tokensPerContent : 0),
    countTools: () => 0,
  };
}
