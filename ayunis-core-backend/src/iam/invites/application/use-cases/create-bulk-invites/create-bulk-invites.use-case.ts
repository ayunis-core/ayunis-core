import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvitesRepository } from '../../ports/invites.repository';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { CreateBulkInvitesCommand } from './create-bulk-invites.command';
import { GetActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.use-case';
import { GetActiveSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.query';
import { UpdateSeatsUseCase } from 'src/iam/subscriptions/application/use-cases/update-seats/update-seats.use-case';
import { UpdateSeatsCommand } from 'src/iam/subscriptions/application/use-cases/update-seats/update-seats.command';
import { isSeatBased } from 'src/iam/subscriptions/domain/subscription-type-guards';
import {
  BulkInviteValidationFailedError,
  InvalidSeatsError,
  UnexpectedInviteError,
} from '../../invites.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { SubscriptionNotFoundError } from 'src/iam/subscriptions/application/subscription.errors';
import { getInviteExpiresAt } from '../../services/invite-expiration.util';
import { Transactional } from '@nestjs-cls/transactional';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import {
  BulkInviteDeliveryService,
  type BulkInviteResult,
} from 'src/iam/invites/application/services/bulk-invite-delivery.service';
import { BulkInviteValidatorService } from 'src/iam/invites/application/services/bulk-invite-validator.service';

interface CreateBulkInvitesResult {
  totalCount: number;
  successCount: number;
  failureCount: number;
  results: BulkInviteResult[];
}

@Injectable()
export class CreateBulkInvitesUseCase {
  private readonly logger = new Logger(CreateBulkInvitesUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly updateSeatsUseCase: UpdateSeatsUseCase,
    private readonly configService: ConfigService,
    private readonly acquireAllocationLock: AcquireSeatAllocationLockUseCase,
    private readonly validator: BulkInviteValidatorService,
    private readonly delivery: BulkInviteDeliveryService,
  ) {}

  async execute(
    command: CreateBulkInvitesCommand,
  ): Promise<CreateBulkInvitesResult> {
    this.logger.log('execute', {
      inviteCount: command.invites.length,
      orgId: command.orgId,
      userId: command.userId,
    });

    try {
      const invites = await this.reserveInvites(command);
      const results = await this.delivery.deliver(command, invites);

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      this.logger.log('Bulk invites completed', {
        totalCount: command.invites.length,
        successCount,
        failureCount,
      });

      return {
        totalCount: command.invites.length,
        successCount,
        failureCount,
        results,
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error creating bulk invites', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedInviteError(error as Error);
    }
  }

  @Transactional()
  private async reserveInvites(
    command: CreateBulkInvitesCommand,
  ): Promise<Invite[]> {
    await this.acquireAllocationLock.execute(command.orgId);
    const validationErrors = await this.validator.validate(command);
    if (validationErrors.length > 0) {
      throw new BulkInviteValidationFailedError(validationErrors);
    }
    await this.handleSeatsForBulkInvites(command);
    const invites = this.buildInvites(command);
    await this.invitesRepository.createMany(invites);
    this.logger.debug('Invites batch created successfully', {
      count: invites.length,
    });
    return invites;
  }

  private buildInvites(command: CreateBulkInvitesCommand): Invite[] {
    const validDuration = this.configService.get<string>(
      'auth.jwt.inviteExpiresIn',
      '7d',
    );
    const expiresAt = getInviteExpiresAt(validDuration);
    return command.invites.map(
      (invite) =>
        new Invite({
          email: invite.email,
          orgId: command.orgId,
          role: invite.role,
          inviterId: command.userId,
          expiresAt,
        }),
    );
  }

  private async handleSeatsForBulkInvites(
    command: CreateBulkInvitesCommand,
  ): Promise<void> {
    const isCloud = this.configService.get<boolean>('app.isCloudHosted', false);
    if (!isCloud) {
      return;
    }

    const subscription = await this.activeSubscription(command);
    if (!subscription) {
      return;
    }

    const sub = subscription.subscription;
    if (!isSeatBased(sub)) {
      return;
    }

    const inviteCount = command.invites.length;

    if (
      subscription.availableSeats !== null &&
      subscription.availableSeats < 0
    ) {
      throw new InvalidSeatsError({
        orgId: command.orgId,
        availableSeats: subscription.availableSeats,
      });
    }

    if (
      subscription.availableSeats !== null &&
      subscription.availableSeats < inviteCount
    ) {
      const additionalSeatsNeeded = inviteCount - subscription.availableSeats;
      await this.updateSeatsUseCase.execute(
        new UpdateSeatsCommand({
          orgId: command.orgId,
          requestingUserId: command.userId,
          noOfSeats: sub.noOfSeats + additionalSeatsNeeded,
        }),
      );
    }
  }

  private async activeSubscription(
    command: CreateBulkInvitesCommand,
  ): Promise<Awaited<
    ReturnType<GetActiveSubscriptionUseCase['execute']>
  > | null> {
    try {
      return await this.getActiveSubscriptionUseCase.execute(
        new GetActiveSubscriptionQuery({
          orgId: command.orgId,
          requestingUserId: command.userId,
        }),
      );
    } catch (error: unknown) {
      if (error instanceof SubscriptionNotFoundError) {
        this.logger.debug('No active subscription found, proceeding', {
          orgId: command.orgId,
        });
        return null;
      }
      throw error;
    }
  }
}
