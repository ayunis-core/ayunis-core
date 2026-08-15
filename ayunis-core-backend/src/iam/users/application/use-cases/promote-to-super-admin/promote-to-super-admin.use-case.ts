import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Transactional } from '@nestjs-cls/transactional';
import { UsersRepository } from '../../ports/users.repository';
import { PromoteToSuperAdminCommand } from './promote-to-super-admin.command';
import { User } from 'src/iam/users/domain/user.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserNotFoundError, UserUnexpectedError } from '../../users.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class PromoteToSuperAdminUseCase {
  constructor(
    @InjectPinoLogger(PromoteToSuperAdminUseCase.name)
    private readonly logger: PinoLogger,
    private readonly usersRepository: UsersRepository,
  ) {}

  @Transactional()
  async execute(command: PromoteToSuperAdminCommand): Promise<User> {
    this.logger.info('execute');

    try {
      const user = await this.usersRepository.findOneByEmail(command.email);
      if (!user) {
        throw new UserNotFoundError(command.email);
      }

      if (user.systemRole === SystemRole.SUPER_ADMIN) {
        return user;
      }

      user.systemRole = SystemRole.SUPER_ADMIN;

      return await this.usersRepository.update(user);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Error promoting user to super admin',
      );
      throw new UserUnexpectedError(error as Error);
    }
  }
}
