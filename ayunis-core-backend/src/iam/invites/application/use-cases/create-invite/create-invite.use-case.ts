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
import { InvalidSeatsError } from '../../invites.errors';

@Injectable()
export class CreateInviteUseCase {
  private readonly logger = new Logger(CreateInviteUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly configService: ConfigService,
    private readonly inviteJwtService: InviteJwtService,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly updateSeatsUseCase: UpdateSeatsUseCase,
  ) {}

  async execute(
    command: CreateInviteCommand,
  ): Promise<{ inviteToken: string }> {
    this.logger.log('execute', {
      email: command.email,
      orgId: command.orgId,
      userId: command.userId,
    });

    const isCloud = this.configService.get<boolean>('app.isCloudHosted', false);
    if (isCloud) {
      const subscription = await this.getActiveSubscriptionUseCase.execute(
        new GetActiveSubscriptionQuery({
          orgId: command.orgId,
          requestingUserId: command.userId,
        }),
      );
      if (subscription && subscription.availableSeats < 0) {
        throw new InvalidSeatsError({
          orgId: command.orgId,
          availableSeats: subscription.availableSeats,
        });
      }
      if (subscription && subscription.availableSeats === 0) {
        await this.updateSeatsUseCase.execute(
          new UpdateSeatsCommand({
            orgId: command.orgId,
            requestingUserId: command.userId,
            noOfSeats: subscription.subscription.noOfSeats + 1,
          }),
        );
      }
    }

    const validDuration = this.configService.get<string>(
      'auth.jwt.inviteExpiresIn',
      '7d',
    );
    const inviteExpiresAt = this.getInviteExpiresAt(validDuration);

    const invite = new Invite({
      email: command.email,
      orgId: command.orgId,
      role: command.role,
      inviterId: command.userId,
      expiresAt: inviteExpiresAt,
    });
    this.logger.debug('Invite to be created', { invite });

    await this.invitesRepository.create(invite);

    // Generate JWT token for the invite
    const inviteToken = this.inviteJwtService.generateInviteToken({
      inviteId: invite.id,
    });

    this.logger.debug('Invite created successfully', {
      inviteId: invite.id,
      email: invite.email,
    });

    return { inviteToken };
  }

  private getInviteExpiresAt(inviteExpiresIn: string): Date {
    // Parse duration like "7d", "24h", "60m", "3600s"
    const match = inviteExpiresIn.match(/^(\d+)([dhms])$/);

    if (!match) {
      throw new Error(
        `Invalid invite expires in format: ${inviteExpiresIn}. Expected format: number + d/h/m/s (e.g., "7d", "24h")`,
      );
    }

    const [, amountStr, unit] = match;
    const amount = parseInt(amountStr, 10);

    let multiplier: number;
    switch (unit) {
      case 'd':
        multiplier = 24 * 60 * 60 * 1000; // days to milliseconds
        break;
      case 'h':
        multiplier = 60 * 60 * 1000; // hours to milliseconds
        break;
      case 'm':
        multiplier = 60 * 1000; // minutes to milliseconds
        break;
      case 's':
        multiplier = 1000; // seconds to milliseconds
        break;
      default:
        throw new Error(`Unsupported time unit: ${unit}`);
    }

    return new Date(Date.now() + amount * multiplier);
  }
}
