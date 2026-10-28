import type { UUID } from 'crypto';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import type { GetThreadPiiMasksUseCase } from 'src/domain/thread-pii-masks/application/use-cases/get-thread-pii-masks/get-thread-pii-masks.use-case';
import { UnmaskedTermsService } from './unmasked-terms.service';

describe('UnmaskedTermsService', () => {
  const threadId = '7b1f2a3c-4d5e-6f70-8192-a3b4c5d6e7f8' as UUID;
  let getMasksExecute: jest.Mock;
  let service: UnmaskedTermsService;

  const message = () =>
    new UserMessage({
      threadId,
      content: [new TextMessageContent('Hallo {{pii:PERSON_NAME_1}}')],
    });

  beforeEach(() => {
    getMasksExecute = jest.fn().mockResolvedValue([]);
    service = new UnmaskedTermsService({
      execute: getMasksExecute,
    } as unknown as GetThreadPiiMasksUseCase);
  });

  it('skips mask lookup for non-anonymous threads', async () => {
    const original = message();

    const result = await service.revealUnmaskedTerms(
      [original],
      threadId,
      false,
    );

    expect(getMasksExecute).not.toHaveBeenCalled();
    expect(result[0]).toBe(original);
  });

  it('reveals only manually unmasked entries', async () => {
    getMasksExecute.mockResolvedValue([
      new ThreadPiiMask({
        threadId,
        category: PiiCategory.PERSON_NAME,
        maskIndex: 1,
        value: 'Dani',
        unmasked: true,
      }),
      new ThreadPiiMask({
        threadId,
        category: PiiCategory.PERSON_NAME,
        maskIndex: 2,
        value: 'Moritz',
      }),
    ]);
    const original = new UserMessage({
      threadId,
      content: [
        new TextMessageContent(
          '{{pii:PERSON_NAME_1}} und {{pii:PERSON_NAME_2}}',
        ),
      ],
    });

    const result = await service.revealUnmaskedTerms(
      [original],
      threadId,
      true,
    );

    expect((result[0].content[0] as TextMessageContent).text).toBe(
      'Dani und {{pii:PERSON_NAME_2}}',
    );
  });

  it('returns the original messages when the thread has no unmasked entries', async () => {
    getMasksExecute.mockResolvedValue([
      new ThreadPiiMask({
        threadId,
        category: PiiCategory.PERSON_NAME,
        maskIndex: 1,
        value: 'Dani',
      }),
    ]);
    const original = message();

    const result = await service.revealUnmaskedTerms(
      [original],
      threadId,
      true,
    );

    expect(result[0]).toBe(original);
  });
});
