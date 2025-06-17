import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from '../../ports/invites.repository';
import { GetInvitesByOrgQuery } from './get-invites-by-org.query';
import { Invite } from '../../../domain/invite.entity';

@Injectable()
export class GetInvitesByOrgUseCase {
  private readonly logger = new Logger(GetInvitesByOrgUseCase.name);

  constructor(private readonly invitesRepository: InvitesRepository) {}

  async execute(query: GetInvitesByOrgQuery): Promise<Invite[]> {
    this.logger.log('execute', {
      orgId: query.orgId,
      requestingUserId: query.requestingUserId,
    });

    // Note: In a real application, you might want to verify that the requesting user
    // has permission to view invites for this organization

    const invites = await this.invitesRepository.findByOrgId(query.orgId);

    this.logger.debug('Found invites', {
      orgId: query.orgId,
      count: invites.length,
    });

    return invites;
  }
}
