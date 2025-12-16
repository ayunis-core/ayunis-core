import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from '../../ports/invites.repository';
import { GetInvitesByOrgQuery } from './get-invites-by-org.query';
import { Invite } from '../../../domain/invite.entity';
import { UnauthorizedInviteAccessError } from '../../invites.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { Paginated } from 'src/common/pagination';

@Injectable()
export class GetInvitesByOrgUseCase {
  private readonly logger = new Logger(GetInvitesByOrgUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetInvitesByOrgQuery): Promise<Paginated<Invite>> {
    try {
      this.logger.log('execute', {
        orgId: query.orgId,
        requestingUserId: query.requestingUserId,
        search: query.search,
        limit: query.limit,
        offset: query.offset,
      });

      const orgId = this.contextService.get('orgId');
      const orgRole = this.contextService.get('role');
      const systemRole = this.contextService.get('systemRole');
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      const isOrgAdmin = orgRole === UserRole.ADMIN && orgId === query.orgId;
      if (!isSuperAdmin && !isOrgAdmin) {
        throw new UnauthorizedInviteAccessError();
      }

      const paginatedInvites =
        await this.invitesRepository.findByOrgIdPaginated(query.orgId, {
          search: query.search,
          limit: query.limit,
          offset: query.offset,
        });

      // Filter only open invites if requested
      if (query.onlyOpen) {
        const filteredData = paginatedInvites.data.filter(
          (invite) =>
            invite.acceptedAt === null || invite.acceptedAt === undefined,
        );
        return new Paginated({
          data: filteredData,
          limit: paginatedInvites.limit,
          offset: paginatedInvites.offset,
          total: filteredData.length,
        });
      }

      this.logger.debug('Found invites', {
        orgId: query.orgId,
        count: paginatedInvites.data.length,
        total: paginatedInvites.total,
      });

      return paginatedInvites;
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
