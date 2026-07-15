import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from '../../ports/invites.repository';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { ResendExpiredInviteCommand } from './resend-expired-invite.command';
import { ConfigService } from '@nestjs/config';
import { InviteJwtService } from '../../services/invite-jwt.service';
import {
  InviteNotFoundError,
  InviteNotExpiredError,
  InviteAlreadyAcceptedError,
  UnexpectedInviteError,
} from '../../invites.errors';
import { getInviteExpiresAt } from '../../services/invite-expiration.util';

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

  @HandleUnexpectedErrors(UnexpectedInviteError)
  async execute(
    command: ResendExpiredInviteCommand,
  ): Promise<ResendExpiredInviteResult> {
    this.logger.log('execute', { inviteId: command.inviteId });

    // 1. Find the existing invite
    const existingInvite = await this.invitesRepository.findOne(
      command.inviteId,
    );
    if (!existingInvite) {
      throw new InviteNotFoundError(command.inviteId);
    }

    // 2. Verify invite is not already accepted
    if (existingInvite.acceptedAt) {
      throw new InviteAlreadyAcceptedError();
    }

    // 3. Verify it is actually expired
    if (existingInvite.expiresAt >= new Date()) {
      throw new InviteNotExpiredError(command.inviteId);
    }

    // 4. Delete the expired invite
    await this.invitesRepository.delete(command.inviteId);

    // 5. Create a new invite with the same data
    const validDuration = this.configService.get<string>(
      'auth.jwt.inviteExpiresIn',
      '7d',
    );
    const inviteExpiresAt = getInviteExpiresAt(validDuration);

    const newInvite = new Invite({
      email: existingInvite.email,
      orgId: existingInvite.orgId,
      role: existingInvite.role,
      inviterId: existingInvite.inviterId,
      expiresAt: inviteExpiresAt,
    });

    await this.invitesRepository.create(newInvite);

    // 6. Generate JWT token for the new invite
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
  }
}
