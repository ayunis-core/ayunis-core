import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { ResendExpiredInviteCommand } from './resend-expired-invite.command';
import { ConfigService } from '@nestjs/config';
import { InviteJwtService } from 'src/iam/invites/application/services/invite-jwt.service';
import {
  InviteNotFoundError,
  InviteNotExpiredError,
  InviteAlreadyAcceptedError,
  UnexpectedInviteError,
} from 'src/iam/invites/application/invites.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { getInviteExpiresAt } from 'src/iam/invites/application/services/invite-expiration.util';

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
    this.logger.log({ inviteId: command.inviteId }, 'execute');
    return await this.resend(command);
  }

  private async resend(
    command: ResendExpiredInviteCommand,
  ): Promise<ResendExpiredInviteResult> {
    const existingInvite = await this.invitesRepository.findOne(
      command.inviteId,
    );
    this.validateExistingInvite(existingInvite, command.inviteId);

    await this.invitesRepository.delete(command.inviteId);
    const newInvite = this.createReplacementInvite(existingInvite);
    await this.invitesRepository.create(newInvite);

    this.logger.debug(
      {
        oldInviteId: command.inviteId,
        newInviteId: newInvite.id,
        email: newInvite.email,
      },
      'Expired invite resent successfully',
    );

    return {
      token: this.inviteJwtService.generateInviteToken({
        inviteId: newInvite.id,
      }),
      invite: newInvite,
    };
  }

  private validateExistingInvite(
    invite: Invite | null,
    inviteId: string,
  ): asserts invite is Invite {
    if (!invite) {
      throw new InviteNotFoundError(inviteId);
    }
    if (invite.acceptedAt) {
      throw new InviteAlreadyAcceptedError();
    }
    if (invite.expiresAt >= new Date()) {
      throw new InviteNotExpiredError(inviteId);
    }
  }

  private createReplacementInvite(existingInvite: Invite): Invite {
    const validDuration = this.configService.get<string>(
      'auth.jwt.inviteExpiresIn',
      '7d',
    );

    return new Invite({
      email: existingInvite.email,
      orgId: existingInvite.orgId,
      role: existingInvite.role,
      inviterId: existingInvite.inviterId,
      expiresAt: getInviteExpiresAt(validDuration),
      teamIds: existingInvite.teamIds,
    });
  }
}
