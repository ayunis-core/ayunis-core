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
        `Was steht hier?\n${image.getReferenceLabel(message.id)}`,
      ) + estimate.tokensPerImage,
    );
  });

  it('counts an empty thread as nothing', () => {
    expect(useCase.execute(new CountMessagesTokensCommand([]))).toBe(0);
  });
});
