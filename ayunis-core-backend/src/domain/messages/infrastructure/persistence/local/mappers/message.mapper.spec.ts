import { randomUUID } from 'crypto';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
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
});
