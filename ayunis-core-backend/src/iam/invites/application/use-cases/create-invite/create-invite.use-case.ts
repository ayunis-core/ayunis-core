import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from '../../ports/invites.repository';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { CreateInviteCommand } from './create-invite.command';
import { ConfigService } from '@nestjs/config';
import { InviteJwtService } from '../../services/invite-jwt.service';

@Injectable()
export class CreateInviteUseCase {
  private readonly logger = new Logger(CreateInviteUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly configService: ConfigService,
    private readonly inviteJwtService: InviteJwtService,
  ) {}

  async execute(
    command: CreateInviteCommand,
  ): Promise<{ inviteToken: string }> {
    this.logger.log('execute', {
      email: command.email,
      orgId: command.orgId,
      userId: command.userId,
    });

    const validDuration = this.configService.get(
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
