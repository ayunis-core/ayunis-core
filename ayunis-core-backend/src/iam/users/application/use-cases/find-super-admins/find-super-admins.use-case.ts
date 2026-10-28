import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { User } from 'src/iam/users/domain/user.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserUnexpectedError } from 'src/iam/users/application/users.errors';

@Injectable()
export class FindSuperAdminsUseCase {
  private readonly logger = new Logger(FindSuperAdminsUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(): Promise<User[]> {
    this.logger.log('execute');
    try {
      return await this.usersRepository.findManyBySystemRole(
        SystemRole.SUPER_ADMIN,
      );
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Error finding super admins',
      );
      throw new UserUnexpectedError(error as Error);
    }
  }
}
