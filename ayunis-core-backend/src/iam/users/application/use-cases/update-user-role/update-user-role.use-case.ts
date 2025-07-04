import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { UpdateUserRoleCommand } from './update-user-role.command';
import { User } from '../../../domain/user.entity';
import {
  UserError,
  UserNotFoundError,
  UserUnexpectedError,
} from '../../users.errors';

@Injectable()
export class UpdateUserRoleUseCase {
  private readonly logger = new Logger(UpdateUserRoleUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(command: UpdateUserRoleCommand): Promise<User> {
    this.logger.log('updateUserRole', {
      userId: command.userId,
      newRole: command.newRole,
    });

    try {
      // Find the user
      const user = await this.usersRepository.findOneById(command.userId);
      if (!user) {
        throw new UserNotFoundError(command.userId);
      }

      // Update the role
      user.role = command.newRole;

      // Save the updated user
      return this.usersRepository.update(user);
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      this.logger.error('Error updating user role', { error });
      throw new UserUnexpectedError(error);
    }
  }
}
