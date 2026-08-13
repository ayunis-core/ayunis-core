import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  BulkInviteDeliveryService,
  type BulkInviteResult,
} from 'src/iam/invites/application/services/bulk-invite-delivery.service';
import { BulkInviteValidatorService } from 'src/iam/invites/application/services/bulk-invite-validator.service';
import {
  BulkInviteValidationFailedError,
  InvalidSeatsError,
  UnexpectedInviteError,
} from 'src/iam/invites/application/invites.errors';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { getInviteExpiresAt } from 'src/iam/invites/application/services/invite-expiration.util';
import { CreateBulkInvitesCommand } from 'src/iam/invites/application/use-cases/create-bulk-invites/create-bulk-invites.command';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { SubscriptionNotFoundError } from 'src/iam/subscriptions/application/subscription.errors';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { GetActiveSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.query';
import { GetActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.use-case';
import { UpdateSeatsCommand } from 'src/iam/subscriptions/application/use-cases/update-seats/update-seats.command';
import { UpdateSeatsUseCase } from 'src/iam/subscriptions/application/use-cases/update-seats/update-seats.use-case';
import { isSeatBased } from 'src/iam/subscriptions/domain/subscription-type-guards';

interface CreateBulkInvitesResult {
  totalCount: number;
  successCount: number;
  failureCount: number;
  results: BulkInviteResult[];
}

@Injectable()
export class CreateBulkInvitesUseCase {
  constructor(
    @InjectPinoLogger(CreateBulkInvitesUseCase.name)
    private readonly logger: PinoLogger,
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
    this.logger.info(
      {
        inviteCount: command.invites.length,
        orgId: command.orgId,
        userId: command.userId,
      },
      'execute',
    );

    try {
      const invites = await this.reserveInvites(command);
      const results = await this.delivery.deliver(command, invites);
      const successCount = results.filter((result) => result.success).length;
      const failureCount = results.length - successCount;

      this.logger.info(
        { totalCount: command.invites.length, successCount, failureCount },
        'Bulk invites completed',
      );

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
      this.logger.error({ err: error as Error }, 'Error creating bulk invites');
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
    this.logger.debug(
      { count: invites.length },
      'Invites batch created successfully',
    );
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
    if (!subscription || !isSeatBased(subscription.subscription)) {
      return;
    }

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
      subscription.availableSeats < command.invites.length
    ) {
      const additionalSeats =
        command.invites.length - subscription.availableSeats;
      await this.updateSeatsUseCase.execute(
        new UpdateSeatsCommand({
          orgId: command.orgId,
          requestingUserId: command.userId,
          noOfSeats: subscription.subscription.noOfSeats + additionalSeats,
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
        this.logger.debug(
          { orgId: command.orgId },
          'No active subscription found, proceeding',
        );
        return null;
      }
      throw error;
    }
  }
}
