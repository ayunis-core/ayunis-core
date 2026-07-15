import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { UsersRepository } from '../../ports/users.repository';
import { PromoteToSuperAdminCommand } from './promote-to-super-admin.command';
import { User } from '../../../domain/user.entity';
import { SystemRole } from '../../../domain/value-objects/system-role.enum';
import { UserNotFoundError, UserUnexpectedError } from '../../users.errors';

@Injectable()
export class PromoteToSuperAdminUseCase {
  private readonly logger = new Logger(PromoteToSuperAdminUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  @Transactional()
  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(command: PromoteToSuperAdminCommand): Promise<User> {
    this.logger.log('execute');

    const user = await this.usersRepository.findOneByEmail(command.email);
    if (!user) {
      throw new UserNotFoundError(command.email);
    }

    if (user.systemRole === SystemRole.SUPER_ADMIN) {
      return user;
    }

    user.systemRole = SystemRole.SUPER_ADMIN;

    return await this.usersRepository.update(user);
  }
}
