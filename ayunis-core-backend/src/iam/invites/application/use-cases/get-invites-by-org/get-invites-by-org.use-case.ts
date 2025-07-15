import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from '../../ports/invites.repository';
import { GetInvitesByOrgQuery } from './get-invites-by-org.query';
import { Invite } from '../../../domain/invite.entity';
import { IsFromOrgUseCase } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.use-case';
import { IsFromOrgQuery } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.query';
import { UnauthorizedInviteAccessError } from '../../invites.errors';

@Injectable()
export class GetInvitesByOrgUseCase {
  private readonly logger = new Logger(GetInvitesByOrgUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly isFromOrgUseCase: IsFromOrgUseCase,
  ) {}

  async execute(query: GetInvitesByOrgQuery): Promise<Invite[]> {
    this.logger.log('execute', {
      orgId: query.orgId,
      requestingUserId: query.requestingUserId,
    });

    const isFromOrg = await this.isFromOrgUseCase.execute(
      new IsFromOrgQuery({
        userId: query.requestingUserId,
        orgId: query.orgId,
      }),
    );
    if (!isFromOrg) {
      throw new UnauthorizedInviteAccessError();
    }

    let invites = await this.invitesRepository.findByOrgId(query.orgId);
    if (query.onlyOpen) {
      invites = invites.filter(
        (invite) =>
          invite.acceptedAt === null || invite.acceptedAt === undefined,
      );
    }

    this.logger.debug('Found invites', {
      orgId: query.orgId,
      count: invites.length,
    });

    return invites;
  }
}
