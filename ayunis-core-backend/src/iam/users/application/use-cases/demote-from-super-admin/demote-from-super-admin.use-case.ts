import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { UsersRepository } from '../../ports/users.repository';
import { DemoteFromSuperAdminCommand } from './demote-from-super-admin.command';
import { SystemRole } from '../../../domain/value-objects/system-role.enum';
import {
  UserNotFoundError,
  UserNotSuperAdminError,
  UserUnexpectedError,
  UserSelfDemotionNotAllowedError,
  UserLastSuperAdminError,
} from '../../users.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class DemoteFromSuperAdminUseCase {
  private readonly logger = new Logger(DemoteFromSuperAdminUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  @Transactional()
  async execute(command: DemoteFromSuperAdminCommand): Promise<void> {
    this.logger.log('execute', {
      userId: command.userId,
      requestingUserId: command.requestingUserId,
    });

    try {
      if (command.userId === command.requestingUserId) {
        throw new UserSelfDemotionNotAllowedError();
      }

      const user = await this.usersRepository.findOneById(command.userId);
      if (!user) {
        throw new UserNotFoundError(command.userId);
      }

      if (user.systemRole !== SystemRole.SUPER_ADMIN) {
        throw new UserNotSuperAdminError(command.userId);
      }

      const superAdmins = await this.usersRepository.findManyBySystemRole(
        SystemRole.SUPER_ADMIN,
      );
      if (superAdmins.length <= 1) {
        throw new UserLastSuperAdminError();
      }

      user.systemRole = SystemRole.CUSTOMER;
      await this.usersRepository.update(user);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error demoting user from super admin', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UserUnexpectedError(error as Error);
    }
  }
}
