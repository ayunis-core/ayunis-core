import { Injectable, Logger } from '@nestjs/common';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { OrgsRepository } from '../../ports/orgs.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { OrgUnauthorizedError } from '../../orgs.errors';
import { SuperAdminGetAllOrgsQuery } from './super-admin-get-all-orgs.query';
import { Paginated } from 'src/common/pagination';

@Injectable()
export class SuperAdminGetAllOrgsUseCase {
  private readonly logger = new Logger(SuperAdminGetAllOrgsUseCase.name);

  constructor(
    private readonly orgsRepository: OrgsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: SuperAdminGetAllOrgsQuery): Promise<Paginated<Org>> {
    this.logger.log('superAdminGetAllOrgs', {
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });

    const systemRole = this.contextService.get('systemRole');
    if (systemRole !== SystemRole.SUPER_ADMIN) {
      this.logger.warn('Non-super admin attempted to list all orgs', {
        systemRole,
      });
      throw new OrgUnauthorizedError('Super admin privileges required');
    }

    return this.orgsRepository.findAllForSuperAdminPaginated({
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });
  }
}
