import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { SystemRole } from '../../../domain/value-objects/system-role.enum';
import { UserUnexpectedError } from '../../users.errors';

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
      this.logger.error('Error finding super admins', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UserUnexpectedError(error as Error);
    }
  }
}
