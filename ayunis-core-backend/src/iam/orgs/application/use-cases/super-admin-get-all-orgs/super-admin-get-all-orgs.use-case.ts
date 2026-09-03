import { Injectable, Logger } from '@nestjs/common';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { OrgUnauthorizedError } from 'src/iam/orgs/application/orgs.errors';
import { SuperAdminGetAllOrgsQuery } from './super-admin-get-all-orgs.query';
import { Paginated } from 'src/common/pagination/paginated.entity';

@Injectable()
export class SuperAdminGetAllOrgsUseCase {
  private readonly logger = new Logger(SuperAdminGetAllOrgsUseCase.name);

  constructor(
    private readonly orgsRepository: OrgsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: SuperAdminGetAllOrgsQuery): Promise<Paginated<Org>> {
    this.logger.log(
      {
        limit: query.limit,
        offset: query.offset,
        text: query.search,
      },
      'superAdminGetAllOrgs',
    );

    const systemRole = this.contextService.get('systemRole');
    if (systemRole !== SystemRole.SUPER_ADMIN) {
      this.logger.warn(
        {
          systemRole,
        },
        'Non-super admin attempted to list all orgs',
      );
      throw new OrgUnauthorizedError('Super admin privileges required');
    }

    return this.orgsRepository.findAllForSuperAdmin(
      {
        limit: query.limit,
        offset: query.offset,
      },
      {
        search: query.search,
      },
    );
  }
}
