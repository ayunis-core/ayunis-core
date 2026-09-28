import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  BulkInviteDeliveryService,
  type BulkInviteResult,
} from 'src/iam/invites/application/services/bulk-invite-delivery.service';
import { BulkInviteValidatorService } from 'src/iam/invites/application/services/bulk-invite-validator.service';
import { BulkInviteTeamResolverService } from 'src/iam/invites/application/services/bulk-invite-team-resolver.service';
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
import { InviteCreatedEventPublisher } from 'src/iam/invites/application/services/invite-created-event-publisher.service';

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
    private readonly teamResolver: BulkInviteTeamResolverService,
    private readonly publishInviteCreated: InviteCreatedEventPublisher,
  ) {}

  @HandleUnexpectedErrors(UnexpectedInviteError)
  async execute(
    command: CreateBulkInvitesCommand,
  ): Promise<CreateBulkInvitesResult> {
    this.logger.log(
      {
        inviteCount: command.invites.length,
        orgId: command.orgId,
        userId: command.userId,
      },
      'execute',
    );

    const invites = await this.reserveInvites(command);
    const results = await this.delivery.deliver(command, invites);
    this.publishSuccessfulInvites(invites, results);
    const successCount = results.filter((result) => result.success).length;
    const failureCount = results.length - successCount;

    this.logger.log(
      { totalCount: command.invites.length, successCount, failureCount },
      'Bulk invites completed',
    );

    return {
      totalCount: command.invites.length,
      successCount,
      failureCount,
      results,
    };
  }

  private publishSuccessfulInvites(
    invites: Invite[],
    results: BulkInviteResult[],
  ): void {
    results.forEach((result, index) => {
      if (result.success) {
        this.publishInviteCreated.publish(invites[index]);
      }
    });
  }

  @Transactional()
  private async reserveInvites(
    command: CreateBulkInvitesCommand,
  ): Promise<Invite[]> {
    await this.acquireAllocationLock.execute(command.orgId);
    const validationErrors = await this.validator.validate(command);
    const teamResolution = await this.teamResolver.resolve(command);
    validationErrors.push(...teamResolution.errors);
    if (validationErrors.length > 0) {
      throw new BulkInviteValidationFailedError(validationErrors);
    }

    await this.handleSeatsForBulkInvites(command);
    const invites = this.buildInvites(command, teamResolution.teamIdsByInvite);
    await this.invitesRepository.createMany(invites);
    this.logger.debug(
      { count: invites.length },
      'Invites batch created successfully',
    );
    return invites;
  }

  private buildInvites(
    command: CreateBulkInvitesCommand,
    teamIdsByInvite: Invite['teamIds'][],
  ): Invite[] {
    const validDuration = this.configService.get<string>(
      'auth.jwt.inviteExpiresIn',
      '7d',
    );
    const expiresAt = getInviteExpiresAt(validDuration);
    return command.invites.map(
      (invite, index) =>
        new Invite({
          email: invite.email,
          orgId: command.orgId,
          role: invite.role,
          inviterId: command.userId,
          expiresAt,
          teamIds: teamIdsByInvite[index],
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
