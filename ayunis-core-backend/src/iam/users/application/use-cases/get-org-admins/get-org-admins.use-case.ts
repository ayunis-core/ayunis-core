import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { User } from 'src/iam/users/domain/user.entity';
import { GetOrgAdminsQuery } from './get-org-admins.query';
import { UserUnexpectedError } from 'src/iam/users/application/users.errors';

@Injectable()
export class GetOrgAdminsUseCase {
  private readonly logger = new Logger(GetOrgAdminsUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(query: GetOrgAdminsQuery): Promise<User[]> {
    this.logger.log({ orgId: query.orgId }, 'execute');
    return this.usersRepository.findAdminsByOrgId(query.orgId);
  }
}
