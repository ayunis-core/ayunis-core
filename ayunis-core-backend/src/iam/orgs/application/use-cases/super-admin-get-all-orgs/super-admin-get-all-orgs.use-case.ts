import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { OrgsRepository } from '../../ports/orgs.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { OrgUnauthorizedError } from '../../orgs.errors';
import { SuperAdminGetAllOrgsQuery } from './super-admin-get-all-orgs.query';
import { Paginated } from 'src/common/pagination/paginated.entity';

@Injectable()
export class SuperAdminGetAllOrgsUseCase {
  constructor(
    @InjectPinoLogger(SuperAdminGetAllOrgsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly orgsRepository: OrgsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: SuperAdminGetAllOrgsQuery): Promise<Paginated<Org>> {
    this.logger.info(
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
