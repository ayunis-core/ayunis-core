import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { GetInviteByTokenQuery } from './get-invite-by-token.query';
import {
  InvalidInviteTokenError,
  InviteNotFoundError,
} from 'src/iam/invites/application/invites.errors';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { FindOrgByIdQuery } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.query';
import type { UUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { InviteStatus } from 'src/iam/invites/domain/invite-status.enum';
import { InviteJwtService } from 'src/iam/invites/application/services/invite-jwt.service';
import type { InviteJwtPayload } from 'src/iam/invites/application/services/invite-jwt.service';
import { GetOrgAuthenticationPolicyQuery } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.query';
import { GetOrgAuthenticationPolicyUseCase } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.use-case';

export interface InviteWithOrgDetails {
  id: UUID;
  orgId: UUID;
  email: string;
  role: UserRole;
  status: InviteStatus;
  sentDate: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  organizationName: string;
  localPasswordLoginEnabled: boolean;
}

@Injectable()
export class GetInviteByTokenUseCase {
  private readonly logger = new Logger(GetInviteByTokenUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly findOrgByIdUseCase: FindOrgByIdUseCase,
    private readonly inviteJwtService: InviteJwtService,
    private readonly getOrgAuthenticationPolicyUseCase: GetOrgAuthenticationPolicyUseCase,
  ) {}

  async execute(query: GetInviteByTokenQuery): Promise<InviteWithOrgDetails> {
    this.logger.log({ hasToken: !!query.token }, 'execute');

    const payload = this.verifyToken(query.token);
    const invite = await this.invitesRepository.findOne(payload.inviteId);
    if (!invite) {
      this.logger.error({ inviteId: payload.inviteId }, 'Invite not found');
      throw new InviteNotFoundError(payload.inviteId);
    }

    const [org, authenticationPolicy] = await Promise.all([
      this.findOrgByIdUseCase.execute(new FindOrgByIdQuery(invite.orgId)),
      this.getOrgAuthenticationPolicyUseCase.execute(
        new GetOrgAuthenticationPolicyQuery(invite.orgId),
      ),
    ]);

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
      orgId: invite.orgId,
      email: invite.email,
      role: invite.role,
      status: getInviteStatus(invite.acceptedAt, invite.expiresAt),
      sentDate: invite.createdAt,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      organizationName: org.name,
      localPasswordLoginEnabled: authenticationPolicy.localPasswordLoginEnabled,
    };
  }

  private verifyToken(token: string): InviteJwtPayload {
    try {
      return this.inviteJwtService.verifyInviteToken(token);
    } catch (error) {
      this.logger.error({ err: error as Error }, 'Invalid invite token');
      throw new InvalidInviteTokenError('Token verification failed');
    }
  }
}

function getInviteStatus(
  acceptedAt: Date | undefined,
  expiresAt: Date,
): InviteStatus {
  if (acceptedAt) return InviteStatus.ACCEPTED;
  if (expiresAt < new Date()) return InviteStatus.EXPIRED;
  return InviteStatus.PENDING;
}
