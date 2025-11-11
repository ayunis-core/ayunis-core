import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { FindUsersByOrgIdQuery } from './find-users-by-org-id.query';
import { User } from '../../../domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class FindUsersByOrgIdUseCase {
  private readonly logger = new Logger(FindUsersByOrgIdUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindUsersByOrgIdQuery): Promise<User[]> {
    this.logger.log('findManyByOrgId', { orgId: query.orgId });
    const systemRole = this.contextService.get('systemRole');
    const orgRole = this.contextService.get('role');
    if (
      !(systemRole === SystemRole.SUPER_ADMIN || orgRole === UserRole.ADMIN)
    ) {
      throw new UnauthorizedAccessError({ orgId: query.orgId });
    }
    return this.usersRepository.findManyByOrgId(query.orgId);
  }
}
