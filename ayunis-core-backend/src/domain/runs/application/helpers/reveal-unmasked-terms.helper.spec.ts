import type { UUID } from 'crypto';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { revealUnmaskedTermsInMessages } from './reveal-unmasked-terms.helper';

describe('revealUnmaskedTermsInMessages', () => {
  const threadId = '7b1f2a3c-4d5e-6f70-8192-a3b4c5d6e7f8' as UUID;
  const tokenToValue = new Map([['{{pii:PERSON_NAME_1}}', 'Dani']]);

  it('returns the original messages when nothing is unmasked', () => {
    const message = new UserMessage({
      threadId,
      content: [new TextMessageContent('Hallo {{pii:PERSON_NAME_1}}')],
    });

    const result = revealUnmaskedTermsInMessages([message], new Map());

    expect(result[0]).toBe(message);
  });

  it('replaces unmasked tokens in text content without mutating the original', () => {
    const message = new UserMessage({
      threadId,
      content: [
        new TextMessageContent(
          'Hallo {{pii:PERSON_NAME_1}} und {{pii:PERSON_NAME_2}}',
        ),
      ],
    });

    const result = revealUnmaskedTermsInMessages([message], tokenToValue);

    expect(result[0]).toBeInstanceOf(UserMessage);
    expect(result[0].id).toBe(message.id);
    expect((result[0].content[0] as TextMessageContent).text).toBe(
      'Hallo Dani und {{pii:PERSON_NAME_2}}',
    );
    expect((message.content[0] as TextMessageContent).text).toBe(
      'Hallo {{pii:PERSON_NAME_1}} und {{pii:PERSON_NAME_2}}',
    );
  });

  it('replaces unmasked tokens in tool results and nested tool-use params', () => {
    const assistant = new AssistantMessage({
      threadId,
      content: [
        new ToolUseMessageContent('tool-1', 'search', {
          query: 'Wer ist {{pii:PERSON_NAME_1}}?',
          nested: { names: ['{{pii:PERSON_NAME_1}}'] },
        }),
      ],
    });
    const toolResult = new ToolResultMessage({
      threadId,
      content: [
        new ToolResultMessageContent(
          'tool-1',
          'search',
          '{{pii:PERSON_NAME_1}} wohnt hier',
        ),
      ],
    });

    const [revealedAssistant, revealedResult] = revealUnmaskedTermsInMessages(
      [assistant, toolResult],
      tokenToValue,
    );

    const toolUse = revealedAssistant.content[0] as ToolUseMessageContent;
    expect(toolUse.params).toEqual({
      query: 'Wer ist Dani?',
      nested: { names: ['Dani'] },
    });
    expect((revealedResult.content[0] as ToolResultMessageContent).result).toBe(
      'Dani wohnt hier',
    );
  });

  it('leaves signed thinking content untouched', () => {
    const thinking = new ThinkingMessageContent(
      'about {{pii:PERSON_NAME_1}}',
      'think-1',
      'signature',
    );
    const assistant = new AssistantMessage({
      threadId,
      content: [thinking],
    });

    const [revealed] = revealUnmaskedTermsInMessages([assistant], tokenToValue);

    expect(revealed.content[0]).toBe(thinking);
  });
});
