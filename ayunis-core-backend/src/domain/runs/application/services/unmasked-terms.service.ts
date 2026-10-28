import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { Message } from 'src/domain/messages/domain/message.entity';
import { GetThreadPiiMasksUseCase } from 'src/domain/thread-pii-masks/application/use-cases/get-thread-pii-masks/get-thread-pii-masks.use-case';
import { GetThreadPiiMasksQuery } from 'src/domain/thread-pii-masks/application/use-cases/get-thread-pii-masks/get-thread-pii-masks.query';
import { revealUnmaskedTermsInMessages } from 'src/domain/runs/application/helpers/reveal-unmasked-terms.helper';

/**
 * Applies the thread's manually unmasked dictionary entries to the message
 * history right before inference, so the LLM sees those terms in their
 * original form while stored messages stay tokenized. Both run loops (legacy
 * and agent runtime) call this on their inference-bound message list.
 */
@Injectable()
export class UnmaskedTermsService {
  constructor(
    private readonly getThreadPiiMasksUseCase: GetThreadPiiMasksUseCase,
  ) {}

  async revealUnmaskedTerms(
    messages: readonly Message[],
    threadId: UUID,
    isAnonymous: boolean,
  ): Promise<Message[]> {
    if (!isAnonymous || messages.length === 0) return [...messages];
    const masks = await this.getThreadPiiMasksUseCase.execute(
      new GetThreadPiiMasksQuery(threadId),
    );
    const tokenToValue = new Map(
      masks
        .filter((mask) => mask.unmasked)
        .map((mask) => [mask.token, mask.value]),
    );
    return revealUnmaskedTermsInMessages(messages, tokenToValue);
  }
}
