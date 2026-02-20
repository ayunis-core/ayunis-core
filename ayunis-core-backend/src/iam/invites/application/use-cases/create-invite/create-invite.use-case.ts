import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from '../../ports/invites.repository';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { CreateInviteCommand } from './create-invite.command';
import { ConfigService } from '@nestjs/config';
import { InviteJwtService } from '../../services/invite-jwt.service';
import { GetActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.use-case';
import { GetActiveSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.query';
import { UpdateSeatsUseCase } from 'src/iam/subscriptions/application/use-cases/update-seats/update-seats.use-case';
import { UpdateSeatsCommand } from 'src/iam/subscriptions/application/use-cases/update-seats/update-seats.command';
import {
  EmailNotAvailableError,
  InvalidSeatsError,
  UnexpectedInviteError,
  UserAlreadyExistsError,
} from '../../invites.errors';
import { SendInvitationEmailUseCase } from '../send-invitation-email/send-invitation-email.use-case';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindUserByEmailUseCase } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.use-case';
import { FindUserByEmailQuery } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.query';
import { UserEmailProviderBlacklistedError } from 'src/iam/users/application/users.errors';
import { SubscriptionNotFoundError } from 'src/iam/subscriptions/application/subscription.errors';
import { getInviteExpiresAt } from '../../services/invite-expiration.util';

interface CreateInviteResult {
  token: string;
  invite: Invite;
}

@Injectable()
export class CreateInviteUseCase {
  private readonly logger = new Logger(CreateInviteUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly inviteJwtService: InviteJwtService,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly updateSeatsUseCase: UpdateSeatsUseCase,
    private readonly sendInvitationEmailUseCase: SendInvitationEmailUseCase,
    private readonly findUserByEmailUseCase: FindUserByEmailUseCase,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: CreateInviteCommand): Promise<CreateInviteResult> {
    this.logger.log('execute', {
      email: command.email,
      orgId: command.orgId,
      userId: command.userId,
    });
    try {
      this.validateEmailProvider(command.email);
      await this.ensureEmailAvailable(command.email, command.orgId);
      await this.ensureCloudSeatsAvailable(command.orgId, command.userId);

      const validDuration = this.configService.get<string>(
        'auth.jwt.inviteExpiresIn',
        '7d',
      );

      const invite = new Invite({
        email: command.email,
        orgId: command.orgId,
        role: command.role,
        inviterId: command.userId,
        expiresAt: getInviteExpiresAt(validDuration),
      });
      this.logger.debug('Invite to be created', { invite });

      await this.invitesRepository.create(invite);

      const inviteToken = this.inviteJwtService.generateInviteToken({
        inviteId: invite.id,
      });

      this.logger.debug('Invite created successfully', {
        inviteId: invite.id,
        email: invite.email,
      });

      return { token: inviteToken, invite };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error creating invite', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedInviteError(error as Error);
    }
  }

  private validateEmailProvider(email: string): void {
    const emailProvider = email.split('@')[1].split('.')[0];
    const blacklist = this.configService.get<string[]>(
      'auth.emailProviderBlacklist',
    )!;
    if (blacklist.includes(emailProvider)) {
      throw new UserEmailProviderBlacklistedError(emailProvider);
    }
  }

  private async ensureEmailAvailable(
    email: string,
    orgId: UUID,
  ): Promise<void> {
    const existingUser = await this.findUserByEmailUseCase.execute(
      new FindUserByEmailQuery(email),
    );
    if (!existingUser) {
      return;
    }
    if (existingUser.orgId === orgId) {
      throw new UserAlreadyExistsError();
    }
    throw new EmailNotAvailableError();
  }

  private async ensureCloudSeatsAvailable(
    orgId: UUID,
    userId: UUID,
  ): Promise<void> {
    const isCloud = this.configService.get<boolean>(
      'app.isCloudHosted',
      false,
    );
    if (!isCloud) {
      return;
    }

    const subscription = await this.fetchActiveSubscription(orgId, userId);
    if (!subscription) {
      return;
    }

    if (subscription.availableSeats < 0) {
      throw new InvalidSeatsError({
        orgId,
        availableSeats: subscription.availableSeats,
      });
    }
    if (subscription.availableSeats === 0) {
      await this.updateSeatsUseCase.execute(
        new UpdateSeatsCommand({
          orgId,
          requestingUserId: userId,
          noOfSeats: subscription.subscription.noOfSeats + 1,
        }),
      );
    }
  }

  private async fetchActiveSubscription(
    orgId: UUID,
    userId: UUID,
  ): Promise<Awaited<
    ReturnType<GetActiveSubscriptionUseCase['execute']>
  > | null> {
    try {
      return await this.getActiveSubscriptionUseCase.execute(
        new GetActiveSubscriptionQuery({
          orgId,
          requestingUserId: userId,
        }),
      );
    } catch (error) {
      if (error instanceof SubscriptionNotFoundError) {
        this.logger.debug('No active subscription found, proceeding', {
          orgId,
        });
        return null;
      }
      throw error;
    }
  }
}
