import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { UpdateUserNameCommand } from './update-user-name.command';
import { User } from '../../../domain/user.entity';
import { UserInvalidInputError, UserNotFoundError } from '../../users.errors';

@Injectable()
export class UpdateUserNameUseCase {
  private readonly logger = new Logger(UpdateUserNameUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(command: UpdateUserNameCommand): Promise<User> {
    this.logger.log('updateUserName', {
      userId: command.userId,
      newName: command.newName,
    });

    try {
      const user = await this.usersRepository.findOneById(command.userId);
      this.logger.debug('user found', {
        userId: user.id,
        currentName: user.name,
      });
      user.name = command.newName;
      const updatedUser = await this.usersRepository.update(user);
      this.logger.log('user name updated successfully', {
        userId: updatedUser.id,
        newName: updatedUser.name,
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }
      this.logger.error('Failed to update user name', {
        error: error.message,
        userId: command.userId,
        newName: command.newName,
      });
      throw new UserInvalidInputError(
        `Failed to update user with ID ${command.userId}`,
      );
    }
  }
}
