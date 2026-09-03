import { Injectable, Logger } from '@nestjs/common';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { GetInvitesByOrgQuery } from './get-invites-by-org.query';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { UnauthorizedInviteAccessError } from 'src/iam/invites/application/invites.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { Paginated } from 'src/common/pagination/paginated.entity';

@Injectable()
export class GetInvitesByOrgUseCase {
  private readonly logger = new Logger(GetInvitesByOrgUseCase.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetInvitesByOrgQuery): Promise<Paginated<Invite>> {
    try {
      this.logger.log(
        {
          orgId: query.orgId,
          requestingUserId: query.requestingUserId,
          input: query.search,
          limit: query.limit,
          offset: query.offset,
        },
        'execute',
      );

      const orgId = this.contextService.get('orgId');
      const orgRole = this.contextService.get('role');
      const systemRole = this.contextService.get('systemRole');
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      const isOrgAdmin = orgRole === UserRole.ADMIN && orgId === query.orgId;
      if (!isSuperAdmin && !isOrgAdmin) {
        throw new UnauthorizedInviteAccessError();
      }

      const paginatedInvites =
        await this.invitesRepository.findByOrgIdPaginated(
          query.orgId,
          { limit: query.limit, offset: query.offset },
          { search: query.search, onlyPending: query.onlyOpen },
        );

      this.logger.debug(
        {
          orgId: query.orgId,
          count: paginatedInvites.data.length,
          total: paginatedInvites.total,
        },
        'Found invites',
      );

      return paginatedInvites;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
        },
        'Failed to get invites by organization',
      );
      throw error;
    }
  }
}
