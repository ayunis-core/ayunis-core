import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { GetOrgAdminsQuery } from './get-org-admins.query';
import { UserUnexpectedError } from '../../users.errors';

@Injectable()
export class GetOrgAdminsUseCase {
  private readonly logger = new Logger(GetOrgAdminsUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(query: GetOrgAdminsQuery): Promise<User[]> {
    this.logger.log('execute', { orgId: query.orgId });
    return this.usersRepository.findAdminsByOrgId(query.orgId);
  }
}
