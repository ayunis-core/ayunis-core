import { Injectable, Logger } from '@nestjs/common';
import { UpdateSeatsCommand } from './update-seats.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import {
  UnauthorizedSubscriptionAccessError,
  SubscriptionNotFoundError,
  InvalidSubscriptionDataError,
  TooManyUsedSeatsError,
  UnexpectedSubscriptionError,
} from '../../subscription.errors';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { FindUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.query';
import { GetInvitesByOrgQuery } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.query';
import { GetActiveSubscriptionQuery } from '../get-active-subscription/get-active-subscription.query';
import { GetActiveSubscriptionUseCase } from '../get-active-subscription/get-active-subscription.use-case';
import { ApplicationError } from 'src/common/errors/base.error';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { SendWebhookCommand } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.command';
import { SubscriptionSeatsUpdatedWebhookEvent } from 'src/common/webhooks/domain/webhook-events/subscription-seats-updated.webhook-event';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class UpdateSeatsUseCase {
  private readonly logger = new Logger(UpdateSeatsUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
    private readonly getInvitesByOrgUseCase: GetInvitesByOrgUseCase,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly sendWebhookUseCase: SendWebhookUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateSeatsCommand): Promise<void> {
    this.logger.log('Adding seats to subscription', {
      orgId: command.orgId,
      requestingUserId: command.requestingUserId,
      noOfSeats: command.noOfSeats,
    });

    try {
      const systemRole = this.contextService.get('systemRole');
      const orgRole = this.contextService.get('role');
      const orgId = this.contextService.get('orgId');
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      const isOrgAdmin = orgRole === UserRole.ADMIN && orgId === command.orgId;
      if (!isSuperAdmin && !isOrgAdmin) {
        throw new UnauthorizedSubscriptionAccessError(
          command.requestingUserId,
          command.orgId,
        );
      }
      this.logger.debug('Validating seat count');
      if (command.noOfSeats <= 0) {
        this.logger.warn('Invalid number of seats provided', {
          noOfSeats: command.noOfSeats,
        });
        throw new InvalidSubscriptionDataError(
          'Number of seats must be greater than 0',
        );
      }

      this.logger.debug('Finding subscription');
      const result = await this.getActiveSubscriptionUseCase.execute(
        new GetActiveSubscriptionQuery({
          orgId: command.orgId,
          requestingUserId: command.requestingUserId,
        }),
      );
      if (!result) {
        this.logger.warn('Subscription not found', {
          orgId: command.orgId,
        });
        throw new SubscriptionNotFoundError(command.orgId);
      }
      const subscription = result.subscription;

      const usersResult = await this.findUsersByOrgIdUseCase.execute(
        new FindUsersByOrgIdQuery({
          orgId: command.orgId,
          pagination: { limit: 1000, offset: 0 },
        }),
      );
      const openInvites = await this.getInvitesByOrgUseCase.execute(
        new GetInvitesByOrgQuery({
          orgId: command.orgId,
          requestingUserId: command.requestingUserId,
          onlyOpen: true,
        }),
      );
      if (command.noOfSeats < usersResult.data.length + openInvites.length) {
        this.logger.warn('Too many used seats', {
          orgId: command.orgId,
          openInvites: openInvites,
        });
        throw new TooManyUsedSeatsError({
          orgId: command.orgId,
          openInvites: openInvites.length,
        });
      }

      this.logger.debug('Updating seats of subscription', {
        currentSeats: subscription.noOfSeats,
        newSeats: command.noOfSeats,
      });

      const previousSeats = subscription.noOfSeats;
      subscription.noOfSeats = command.noOfSeats;
      await this.subscriptionRepository.update(subscription);

      this.logger.debug('Seats updated successfully', {
        subscriptionId: subscription.id,
        orgId: command.orgId,
        previousSeats,
        newSeats: subscription.noOfSeats,
      });

      // Send webhook asynchronously (don't block the main operation)
      void this.sendWebhookUseCase.execute(
        new SendWebhookCommand(
          new SubscriptionSeatsUpdatedWebhookEvent(subscription),
        ),
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error('Adding seats failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
        noOfSeats: command.noOfSeats,
      });
      throw new UnexpectedSubscriptionError(
        'Unexpected error during seat addition',
      );
    }
  }
}
