import { countMessageTokens } from 'src/common/token-counter/application/util/context-budget.helper';
import { toBudgetParts } from 'src/domain/messages/application/utils/message-parts.util';
import { toRuntimeBudgetParts } from './runtime-message-parts.helper';
import type { TokenEstimator } from '@ayunis/inference';
import { randomUUID } from 'crypto';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { MapMessagesToInferenceUseCase } from 'src/domain/models/application/use-cases/map-messages-to-inference/map-messages-to-inference.use-case';
import { RunContextBudgetExceededError } from 'src/domain/runs/application/runs.errors';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { InternetSearchTool } from 'src/domain/tools/domain/tools/internet-search-tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { ROUTINE_NUDGE_MESSAGE } from 'src/domain/runs/application/run-profiles/routine-completion.policy';
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
      backendTools: [],
      request: {
        instructions: '',
        tools: [],
        model: {
          contextWindowSize: 2_000,
        },
        tokenEstimator: fixedEstimator(30),
      },
    });

    const estimator = fixedEstimator(30);
    expect(
      result.reduce(
        (sum, message) =>
          sum + countMessageTokens(estimator, toRuntimeBudgetParts(message)),
        0,
      ),
    ).toBe(countMessageTokens(estimator, toBudgetParts(retained)));
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
      backendTools: [],
      request: {
        instructions: '',
        tools: [],
        model: {
          contextWindowSize: 1_112,
        },
        tokenEstimator: fixedEstimator(10),
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
        backendTools: [],
        request: {
          instructions: '',
          tools: [],
          model: {
            contextWindowSize: 88_889,
          },
          tokenEstimator: fixedEstimator(80_001),
        },
      }),
    ).rejects.toBeInstanceOf(RunContextBudgetExceededError);
    expect(loadImage).not.toHaveBeenCalled();
  });
});

it('replays a routine run to a later chat that does not offer finish_routine', async () => {
  const threadId = randomUUID();
  const finishCall = new ToolUseMessageContent(
    'call-finish',
    ToolType.FINISH_ROUTINE,
    {},
  );
  const messages = [
    new UserMessage({
      threadId,
      content: [new TextMessageContent('Prüfe die Verkündungsplattform.')],
    }),
    new AssistantMessage({
      threadId,
      content: [new TextMessageContent('Es gibt zwei neue Verordnungen.')],
    }),
    new UserMessage({
      threadId,
      content: [new TextMessageContent(ROUTINE_NUDGE_MESSAGE)],
    }),
    new AssistantMessage({ threadId, content: [finishCall] }),
    new ToolResultMessage({
      threadId,
      content: [
        new ToolResultMessageContent(
          'call-finish',
          ToolType.FINISH_ROUTINE,
          'Tool execution is handled externally',
        ),
      ],
    }),
    new UserMessage({
      threadId,
      content: [new TextMessageContent('Welche Verordnungen waren das?')],
    }),
  ];
  const chatTools = [new InternetSearchTool()];

  const result = await buildMaterializer(jest.fn()).materialize({
    messages,
    orgId: randomUUID(),
    backendTools: chatTools,
    request: {
      instructions: '',
      tools: [],
      model: { contextWindowSize: 200_000 },
      tokenEstimator: fixedEstimator(1),
    },
  });

  expect(result.map((message) => message.role)).toEqual([
    'user',
    'assistant',
    'user',
    'assistant',
    'tool_result',
    'user',
  ]);
  expect(result[3].content).toEqual([
    expect.objectContaining({
      type: 'tool_use',
      id: 'call-finish',
      name: ToolType.FINISH_ROUTINE,
      input: {},
    }),
  ]);
  expect(result[4].content).toEqual([
    expect.objectContaining({
      type: 'tool_result',
      toolCallId: 'call-finish',
      result: 'Tool execution is handled externally',
    }),
  ]);
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

it('reserves instruction and tool overhead before materializing history', async () => {
  const threadId = randomUUID();
  const messages = [
    new UserMessage({
      threadId,
      content: [new TextMessageContent('a'.repeat(30))],
    }),
    new AssistantMessage({
      threadId,
      content: [new TextMessageContent('b'.repeat(30))],
    }),
    new UserMessage({
      threadId,
      content: [new TextMessageContent('c'.repeat(30))],
    }),
    new AssistantMessage({
      threadId,
      content: [new TextMessageContent('d'.repeat(30))],
    }),
  ];
  const result = await buildMaterializer(jest.fn()).materialize({
    messages,
    orgId: randomUUID(),
    backendTools: [],
    request: {
      model: { contextWindowSize: 200 },
      instructions: 'i'.repeat(50),
      tools: [
        { name: 'search', description: 'Search records', parameters: {} },
      ],
      tokenEstimator: {
        exact: false,
        tokensPerMessage: 0,
        tokensPerImage: 1600,
        countText: (text) => text.length,
        countTools: () => 20,
      },
    },
  });
  expect(result.map((message) => message.content)).toMatchObject([
    [{ type: 'text', text: 'c'.repeat(30) }],
    [{ type: 'text', text: 'd'.repeat(30) }],
  ]);
});
