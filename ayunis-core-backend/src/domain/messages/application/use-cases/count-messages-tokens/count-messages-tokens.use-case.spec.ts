import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { getImageReferenceLabel } from 'src/domain/messages/application/utils/image-reference-label.util';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { estimatedTokens } from '@ayunis/inference';
import { randomUUID } from 'crypto';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { CountMessagesTokensCommand } from './count-messages-tokens.command';
import { CountMessagesTokensUseCase } from './count-messages-tokens.use-case';

describe('CountMessagesTokensUseCase', () => {
  const useCase = new CountMessagesTokensUseCase();
  const estimate = estimatedTokens();
  const threadId = randomUUID();

  it('counts the text of every message with the shared estimate', () => {
    const question = 'Wie beantrage ich Wohngeld?';
    const answer = 'Online über das Portal der Gemeinde.';

    const tokens = useCase.execute(
      new CountMessagesTokensCommand([
        new UserMessage({
          threadId,
          content: [new TextMessageContent(question)],
        }),
        new AssistantMessage({
          threadId,
          content: [new TextMessageContent(answer)],
        }),
      ]),
    );

    expect(tokens).toBe(estimate.countText(`${question}\n${answer}`));
  });

  it('prices an image as its reference label plus the fixed image cost, like the context budget', () => {
    const image = new ImageMessageContent(0, 'image/png');
    const message = new UserMessage({
      threadId,
      content: [new TextMessageContent('Was steht hier?'), image],
    });

    const tokens = useCase.execute(new CountMessagesTokensCommand([message]));

    expect(tokens).toBe(
      estimate.countText(
        `Was steht hier?\n${getImageReferenceLabel(image, message.id)}`,
      ) + estimate.tokensPerImage,
    );
  });

  it('counts an empty thread as nothing', () => {
    expect(useCase.execute(new CountMessagesTokensCommand([]))).toBe(0);
  });
});

it('includes thinking, tool arguments, and tool results in the warning estimate', () => {
  const threadId = randomUUID();
  const message = new AssistantMessage({
    threadId,
    content: [
      new ThinkingMessageContent('Prüfe die Rechtsgrundlage.'),
      new ToolUseMessageContent('call-1', 'search', { query: 'Wohngeld' }),
    ],
  });
  const resultMessage = new ToolResultMessage({
    threadId,
    content: [
      new ToolResultMessageContent('call-1', 'search', 'Wohngeldgesetz § 3'),
    ],
  });
  const expectedText =
    'Prüfe die Rechtsgrundlage.\ncall-1 search {"query":"Wohngeld"}\ncall-1 search Wohngeldgesetz § 3';
  expect(
    new CountMessagesTokensUseCase().execute(
      new CountMessagesTokensCommand([message, resultMessage]),
    ),
  ).toBe(estimatedTokens().countText(expectedText));
});
