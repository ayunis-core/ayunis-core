import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { randomUUID } from 'crypto';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import type { ToolSchema } from '../../../domain/value-objects/tool-schema';
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
      createPinoLoggerMock(),
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
});
