import { Injectable, Logger } from '@nestjs/common';
import { GetSubscriptionStatusQuery } from './get-subscription-status.query';
import { HasActiveSubscriptionUseCase } from '../has-active-subscription/has-active-subscription.use-case';
import { HasActiveSubscriptionQuery } from '../has-active-subscription/has-active-subscription.query';
import { GetTrialUseCase } from '../get-trial/get-trial.use-case';
import { GetTrialQuery } from '../get-trial/get-trial.query';
import { SubscriptionStatusResponseDto } from '../../../presenters/http/dto/subscription-status.response.dto';
import { UnexpectedSubscriptionError } from '../../subscription.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetSubscriptionStatusUseCase {
  private readonly logger = new Logger(GetSubscriptionStatusUseCase.name);

  constructor(
    private readonly hasActiveSubscriptionUseCase: HasActiveSubscriptionUseCase,
    private readonly getTrialUseCase: GetTrialUseCase,
  ) {}

  async execute(
    query: GetSubscriptionStatusQuery,
  ): Promise<SubscriptionStatusResponseDto> {
    this.logger.log('Getting subscription status', {
      orgId: query.orgId,
    });

    try {
      const hasActiveSubscription =
        await this.hasActiveSubscriptionUseCase.execute(
          new HasActiveSubscriptionQuery(query.orgId),
        );

      // If user has active subscription, no need to check trial
      if (hasActiveSubscription) {
        this.logger.debug('Active subscription found, skipping trial check', {
          orgId: query.orgId,
        });

        return {
          hasActiveSubscription: true,
          isMessageLimitReached: false,
          trial: null,
        };
      }

      // Only check trial if no active subscription
      const trial = await this.getTrialUseCase.execute(
        new GetTrialQuery(query.orgId),
      );

      if (!trial) {
        return {
          hasActiveSubscription: false,
          isMessageLimitReached: true,
          trial: null,
        };
      }

      const isMessageLimitReached = trial.messagesSent >= trial.maxMessages;
      return {
        hasActiveSubscription: false,
        isMessageLimitReached,
        trial: {
          id: trial.id,
          createdAt: trial.createdAt,
          updatedAt: trial.updatedAt,
          orgId: trial.orgId,
          messagesSent: trial.messagesSent,
          maxMessages: trial.maxMessages,
        },
      };
    } catch (error: unknown) {
      if (error instanceof ApplicationError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error('Failed to get subscription status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: query.orgId,
      });

      throw new UnexpectedSubscriptionError(
        'Unexpected error during subscription status retrieval',
        {
          operation: 'get-subscription-status',
          ...(error instanceof Error && { originalError: error.message }),
        },
      );
    }
  }
}
