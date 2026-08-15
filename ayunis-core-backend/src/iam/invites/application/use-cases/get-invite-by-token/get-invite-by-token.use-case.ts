import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InvitesRepository } from '../../ports/invites.repository';
import { GetInviteByTokenQuery } from './get-invite-by-token.query';
import {
  InvalidInviteTokenError,
  InviteNotFoundError,
} from '../../invites.errors';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { FindOrgByIdQuery } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.query';
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
  constructor(
    @InjectPinoLogger(GetInviteByTokenUseCase.name)
    private readonly logger: PinoLogger,
    private readonly invitesRepository: InvitesRepository,
    private readonly findOrgByIdUseCase: FindOrgByIdUseCase,
    private readonly inviteJwtService: InviteJwtService,
  ) {}

  async execute(query: GetInviteByTokenQuery): Promise<InviteWithOrgDetails> {
    this.logger.info({ hasToken: !!query.token }, 'execute');

    // Verify and decode the JWT token
    let payload: InviteJwtPayload;
    try {
      payload = this.inviteJwtService.verifyInviteToken(query.token);
    } catch (error) {
      this.logger.error(
        {
          err: error as Error,
        },
        'Invalid invite token',
      );
      throw new InvalidInviteTokenError('Token verification failed');
    }
    const invite = await this.invitesRepository.findOne(payload.inviteId);
    if (!invite) {
      this.logger.error({ inviteId: payload.inviteId }, 'Invite not found');
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

    this.logger.debug(
      {
        inviteId: invite.id,
        email: invite.email,
        name: org.name,
      },
      'Found invite with org details',
    );

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
