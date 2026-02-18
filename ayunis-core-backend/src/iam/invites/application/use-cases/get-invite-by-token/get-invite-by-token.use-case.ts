import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from '../../ports/invites.repository';
import { GetInviteByTokenQuery } from './get-invite-by-token.query';
import {
  InvalidInviteTokenError,
  InviteNotFoundError,
} from '../../invites.errors';
import { FindOrgByIdUseCase } from '../../../../orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { FindOrgByIdQuery } from '../../../../orgs/application/use-cases/find-org-by-id/find-org-by-id.query';
import { UUID } from 'crypto';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { InviteStatus } from 'src/iam/invites/domain/invite-status.enum';
import {
  InviteJwtPayload,
  InviteJwtService,
} from '../../services/invite-jwt.service';

export interface InviteWithOrgDetails {
  id: UUID;
  email: string;
  role: UserRole;
  status: InviteStatus;
  sentDate: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  organizationName: string;
}

@Injectable()
export class GetInviteByTokenUseCase {
  private readonly logger = new Logger(GetInviteByTokenUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly findOrgByIdUseCase: FindOrgByIdUseCase,
    private readonly inviteJwtService: InviteJwtService,
  ) {}

  async execute(query: GetInviteByTokenQuery): Promise<InviteWithOrgDetails> {
    this.logger.log('execute', { token: query.token });

    // Verify and decode the JWT token
    let payload: InviteJwtPayload;
    try {
      payload = this.inviteJwtService.verifyInviteToken(query.token);
    } catch (error) {
      this.logger.error('Invalid invite token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new InvalidInviteTokenError('Token verification failed');
    }
    const invite = await this.invitesRepository.findOne(payload.inviteId);
    if (!invite) {
      this.logger.error('Invite not found', { inviteId: payload.inviteId });
      throw new InviteNotFoundError(payload.inviteId);
    }

    // Get organization details
    const org = await this.findOrgByIdUseCase.execute(
      new FindOrgByIdQuery(invite.orgId),
    );

    // Calculate status
    let status: InviteStatus;
    if (invite.acceptedAt) {
      status = InviteStatus.ACCEPTED;
    } else if (invite.expiresAt < new Date()) {
      status = InviteStatus.EXPIRED;
    } else {
      status = InviteStatus.PENDING;
    }

    this.logger.debug('Found invite with org details', {
      inviteId: invite.id,
      email: invite.email,
      orgName: org.name,
    });

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status,
      sentDate: invite.createdAt,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      organizationName: org.name,
    };
  }
}
