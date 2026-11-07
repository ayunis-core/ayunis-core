import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HasActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { HasActiveSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.query';
import { GetTrialUseCase } from 'src/iam/trials/application/use-cases/get-trial/get-trial.use-case';
import { GetTrialQuery } from 'src/iam/trials/application/use-cases/get-trial/get-trial.query';
import { IncrementTrialMessagesUseCase } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import { IncrementTrialMessagesCommand } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.command';
import { TrialNotFoundError } from 'src/iam/trials/application/trial.errors';
import { RoutineSubscriptionRequiredError } from 'src/domain/routines/application/routines.errors';

/**
 * The subscription gate a chat message passes (`@RequireSubscription()` on
 * send-message), applied to a routine execution: an active subscription
 * admits it, otherwise the trial does and one trial message is consumed.
 * Nudges within the execution do not count again, as one chat message's tool
 * turns do not.
 */
@Injectable()
export class RoutineSubscriptionGate {
  private readonly logger = new Logger(RoutineSubscriptionGate.name);

  constructor(
    private readonly hasActiveSubscriptionUseCase: HasActiveSubscriptionUseCase,
    private readonly getTrialUseCase: GetTrialUseCase,
    private readonly incrementTrialMessagesUseCase: IncrementTrialMessagesUseCase,
  ) {}

  async admit(orgId: UUID): Promise<void> {
    const { hasActiveSubscription } =
      await this.hasActiveSubscriptionUseCase.execute(
        new HasActiveSubscriptionQuery(orgId),
      );
    if (hasActiveSubscription) return;
    if (!(await this.hasTrialMessagesLeft(orgId))) {
      throw new RoutineSubscriptionRequiredError({ orgId });
    }
    await this.consumeTrialMessage(orgId);
  }

  private async hasTrialMessagesLeft(orgId: UUID): Promise<boolean> {
    try {
      const trial = await this.getTrialUseCase.execute(
        new GetTrialQuery(orgId),
      );
      return trial.messagesSent < trial.maxMessages;
    } catch (error) {
      if (error instanceof TrialNotFoundError) return false;
      throw error;
    }
  }

  // Like the chat path, a failed count never fails a run already admitted.
  private async consumeTrialMessage(orgId: UUID): Promise<void> {
    try {
      await this.incrementTrialMessagesUseCase.execute(
        new IncrementTrialMessagesCommand(orgId),
      );
    } catch (error) {
      this.logger.error(
        { orgId, err: error as Error },
        'Failed to increment trial messages',
      );
    }
  }
}
