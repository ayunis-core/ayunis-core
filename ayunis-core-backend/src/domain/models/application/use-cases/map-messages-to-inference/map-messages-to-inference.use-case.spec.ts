import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { UNANSWERED_TOOL_CALL_RESULT } from 'src/domain/models/application/helpers/pair-tool-results.helper';
import type { ToolSchema } from 'src/domain/models/domain/value-objects/tool-schema';
import { MapMessagesToInferenceCommand } from './map-messages-to-inference.command';
import { MapMessagesToInferenceUseCase } from './map-messages-to-inference.use-case';

describe('MapMessagesToInferenceUseCase', () => {
  it('strips schema-disallowed nulls from replayed tool calls', async () => {
    const message = new AssistantMessage({
      threadId: randomUUID(),
      content: [
        new ToolUseMessageContent('call-1', 'search_customers', {
          municipality: 'Ladenburg',
          churnDate: null,
        }),
      ],
    });
    const searchTool: ToolSchema = {
      name: 'search_customers',
      description: 'Search municipal customers',
      parameters: {
        type: 'object',
        properties: {
          municipality: { type: 'string' },
          churnDate: { type: 'string', format: 'date' },
        },
      },
    };
    const command = new MapMessagesToInferenceCommand([message], randomUUID(), [
      searchTool,
    ]);
    const useCase = new MapMessagesToInferenceUseCase(
      {} as ImageContentService,
    );

    const [mapped] = await useCase.execute(command);

    expect(mapped.content[0]).toEqual({
      type: 'tool_use',
      id: 'call-1',
      name: 'search_customers',
      input: { municipality: 'Ladenburg' },
      providerMetadata: null,
    });
    expect(message.content[0]).toMatchObject({
      params: { municipality: 'Ladenburg', churnDate: null },
    });
  });

  it('answers a tool call the user moved past before the history reaches a provider', async () => {
    const threadId = randomUUID();
    const warn = jest.spyOn(Logger.prototype, 'warn');
    const offer = new AssistantMessage({
      threadId,
      content: [new ToolUseMessageContent('email-1', 'send_email', {})],
    });
    const command = new MapMessagesToInferenceCommand(
      [
        new UserMessage({
          threadId,
          content: [new TextMessageContent('Draft a reply.')],
        }),
        offer,
        new UserMessage({
          threadId,
          content: [new TextMessageContent('Summarise instead.')],
        }),
      ],
      randomUUID(),
      [],
    );
    const useCase = new MapMessagesToInferenceUseCase(
      {} as ImageContentService,
    );

    const mapped = await useCase.execute(command);

    expect(mapped.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'tool_result',
      'user',
    ]);
    expect(mapped[2].content).toEqual([
      {
        type: 'tool_result',
        toolCallId: 'email-1',
        toolName: 'send_email',
        result: UNANSWERED_TOOL_CALL_RESULT,
      },
    ]);
    expect(warn).toHaveBeenCalledWith(
      { placeholderCount: 1, droppedResultCount: 0 },
      'Repaired unpaired tool results in thread history',
    );
  });
});
