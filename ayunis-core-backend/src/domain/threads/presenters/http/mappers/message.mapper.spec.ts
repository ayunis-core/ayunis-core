import type { UUID } from 'crypto';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { MessageDtoMapper } from './message.mapper';

const THREAD_ID = 'baeb758c-3cfe-4720-b150-2fe89022e587' as UUID;
const MESSAGE_ID = '9faee01f-f1f2-4b5d-bda4-4c2c440eb5e7' as UUID;

describe('MessageDtoMapper', () => {
  it('exposes transient tool-call stream state to SSE consumers', () => {
    const mapper = new MessageDtoMapper();
    const message = new AssistantMessage({
      id: MESSAGE_ID,
      threadId: THREAD_ID,
      content: [
        new ToolUseMessageContent(
          'call-1',
          'internet_search',
          {},
          null,
          undefined,
          { status: 'invalid', argumentsJson: '{"query":' },
        ),
      ],
    });

    const dto = mapper.toDto(message);

    expect(dto.content[0]).toMatchObject({
      type: 'tool_use',
      stream: {
        status: 'invalid',
        argumentsJson: '{"query":',
      },
    });
  });
});
