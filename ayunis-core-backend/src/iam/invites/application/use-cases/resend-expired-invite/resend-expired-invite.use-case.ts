import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from '../../ports/invites.repository';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { ResendExpiredInviteCommand } from './resend-expired-invite.command';
import { ConfigService } from '@nestjs/config';
import { InviteJwtService } from '../../services/invite-jwt.service';
import {
  InviteNotFoundError,
  InviteNotExpiredError,
  UnexpectedInviteError,
} from '../../invites.errors';
import { ApplicationError } from 'src/common/errors/base.error';

interface ResendExpiredInviteResult {
  token: string;
  invite: Invite;
}

@Injectable()
export class ResendExpiredInviteUseCase {
  private readonly logger = new Logger(ResendExpiredInviteUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly inviteJwtService: InviteJwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    command: ResendExpiredInviteCommand,
  ): Promise<ResendExpiredInviteResult> {
    this.logger.log('execute', { inviteId: command.inviteId });

    try {
      // 1. Find the existing invite
      const existingInvite = await this.invitesRepository.findOne(
        command.inviteId,
      );
      if (!existingInvite) {
        throw new InviteNotFoundError(command.inviteId);
      }

      // 2. Verify it is actually expired
      if (existingInvite.expiresAt >= new Date()) {
        throw new InviteNotExpiredError(command.inviteId);
      }

      // 3. Delete the expired invite
      await this.invitesRepository.delete(command.inviteId);

      // 4. Create a new invite with the same data
      const validDuration = this.configService.get<string>(
        'auth.jwt.inviteExpiresIn',
        '7d',
      );
      const inviteExpiresAt = this.getInviteExpiresAt(validDuration);

      const newInvite = new Invite({
        email: existingInvite.email,
        orgId: existingInvite.orgId,
        role: existingInvite.role,
        inviterId: existingInvite.inviterId,
        expiresAt: inviteExpiresAt,
      });

      await this.invitesRepository.create(newInvite);

      // 5. Generate JWT token for the new invite
      const inviteToken = this.inviteJwtService.generateInviteToken({
        inviteId: newInvite.id,
      });

      this.logger.debug('Expired invite resent successfully', {
        oldInviteId: command.inviteId,
        newInviteId: newInvite.id,
        email: newInvite.email,
      });

      return {
        token: inviteToken,
        invite: newInvite,
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error resending expired invite', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedInviteError(error as Error);
    }
  }

  private getInviteExpiresAt(inviteExpiresIn: string): Date {
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
        multiplier = 24 * 60 * 60 * 1000;
        break;
      case 'h':
        multiplier = 60 * 60 * 1000;
        break;
      case 'm':
        multiplier = 60 * 1000;
        break;
      case 's':
        multiplier = 1000;
        break;
      default:
        throw new Error(`Unsupported time unit: ${unit}`);
    }

    return new Date(Date.now() + amount * multiplier);
  }
}
