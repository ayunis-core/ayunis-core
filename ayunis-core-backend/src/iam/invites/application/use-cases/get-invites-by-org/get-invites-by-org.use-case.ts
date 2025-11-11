import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from '../../ports/invites.repository';
import { GetInvitesByOrgQuery } from './get-invites-by-org.query';
import { Invite } from '../../../domain/invite.entity';
import { UnauthorizedInviteAccessError } from '../../invites.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@Injectable()
export class GetInvitesByOrgUseCase {
  private readonly logger = new Logger(GetInvitesByOrgUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetInvitesByOrgQuery): Promise<Invite[]> {
    try {
      this.logger.log('execute', {
        orgId: query.orgId,
        requestingUserId: query.requestingUserId,
      });

      const orgId = this.contextService.get('orgId');
      const orgRole = this.contextService.get('role');
      const systemRole = this.contextService.get('systemRole');
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      const isOrgAdmin = orgRole === UserRole.ADMIN && orgId === query.orgId;
      if (!isSuperAdmin && !isOrgAdmin) {
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
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to get invites by organization', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
