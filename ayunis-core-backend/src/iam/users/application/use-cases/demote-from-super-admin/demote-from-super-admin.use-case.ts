import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
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

@Injectable()
export class DemoteFromSuperAdminUseCase {
  private readonly logger = new Logger(DemoteFromSuperAdminUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  @Transactional()
  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(command: DemoteFromSuperAdminCommand): Promise<void> {
    this.logger.log('execute', {
      userId: command.userId,
      requestingUserId: command.requestingUserId,
    });

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
  }
}
