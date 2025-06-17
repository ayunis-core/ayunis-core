import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { UpdateUserRoleCommand } from './update-user-role.command';
import { User } from '../../../domain/user.entity';

@Injectable()
export class UpdateUserRoleUseCase {
  private readonly logger = new Logger(UpdateUserRoleUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(command: UpdateUserRoleCommand): Promise<User> {
    this.logger.log('updateUserRole', {
      userId: command.userId,
      newRole: command.newRole,
    });

    // Find the user
    const user = await this.usersRepository.findOneById(command.userId);

    // Update the role
    user.role = command.newRole;

    // Save the updated user
    return this.usersRepository.update(user);
  }
}
