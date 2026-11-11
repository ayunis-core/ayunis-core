import { randomUUID } from 'crypto';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolCallDecision } from 'src/domain/messages/domain/value-objects/tool-call-decision.object';
import { MessageMapper } from './message.mapper';

describe('MessageMapper', () => {
  const mapper = new MessageMapper();

  it('keeps a nudge marked as sent by the system through persistence', () => {
    const message = new UserMessage({
      threadId: randomUUID(),
      content: [
        new TextMessageContent(
          'Nobody can read this reply.',
          null,
          false,
          true,
        ),
      ],
    });

    const restored = mapper.toDomain(mapper.toRecord(message));

    expect(restored.content[0]).toMatchObject({ isNudge: true });
  });

  it('stores no nudge flag for a message the user wrote', () => {
    const message = new UserMessage({
      threadId: randomUUID(),
      content: [new TextMessageContent('Was gibt es Neues?')],
    });

    expect(mapper.toRecord(message).content[0]).not.toHaveProperty('isNudge');
  });

  it('keeps a tool call marked as requiring confirmation through persistence', () => {
    const message = new AssistantMessage({
      threadId: randomUUID(),
      content: [
        new ToolUseMessageContent(
          'call-1',
          'mcp__tool__search_meetings__4f1c2a9b',
          { query: 'Bauausschuss' },
          null,
          undefined,
          undefined,
          true,
        ),
      ],
    });

    const restored = mapper.toDomain(mapper.toRecord(message));

    expect(restored.content[0]).toMatchObject({ requiresConfirmation: true });
  });

  it("keeps the user's decision on a tool result through persistence", () => {
    const message = new ToolResultMessage({
      threadId: randomUUID(),
      content: [
        new ToolResultMessageContent(
          'call-1',
          'mcp__tool__search_meetings__4f1c2a9b',
          'The user rejected this tool call.',
          ToolCallDecision.REJECTED,
        ),
      ],
    });

    const restored = mapper.toDomain(mapper.toRecord(message));

    expect(restored.content[0]).toMatchObject({
      decision: ToolCallDecision.REJECTED,
    });
  });
});
