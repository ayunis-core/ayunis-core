import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UsersRepository } from '../../ports/users.repository';
import { User } from 'src/iam/users/domain/user.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserUnexpectedError } from '../../users.errors';

@Injectable()
export class FindSuperAdminsUseCase {
  constructor(
    @InjectPinoLogger(FindSuperAdminsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(): Promise<User[]> {
    this.logger.info('execute');
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
