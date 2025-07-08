import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { UpdatePasswordCommand } from './update-password.command';
import {
  UserError,
  UserInvalidInputError,
  UserNotFoundError,
} from '../../users.errors';
import { HashTextCommand } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.command';
import { HashTextUseCase } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.use-case';
import { HashingError } from 'src/iam/hashing/application/hashing.errors';
import { ValidateUserUseCase } from '../validate-user/validate-user.use-case';
import { ValidateUserQuery } from '../validate-user/validate-user.query';

@Injectable()
export class UpdatePasswordUseCase {
  private readonly logger = new Logger(UpdatePasswordUseCase.name);
  constructor(
    private readonly validateUserUseCase: ValidateUserUseCase,
    private readonly usersRepository: UsersRepository,
    private readonly hashTextUseCase: HashTextUseCase,
  ) {}

  async execute(command: UpdatePasswordCommand): Promise<void> {
    this.logger.log('updatePassword', { userId: command.userId });

    try {
      if (command.newPassword !== command.newPasswordConfirmation) {
        throw new UserInvalidInputError('Passwords do not match');
      }

      const user = await this.usersRepository.findOneById(command.userId);
      if (!user) {
        throw new UserNotFoundError(command.userId);
      }

      // Check if the current password is valid
      await this.validateUserUseCase.execute(
        new ValidateUserQuery(user.email, command.currentPassword),
      );

      const isValidPassword = await this.usersRepository.isValidPassword(
        command.currentPassword,
      );

      if (!isValidPassword) {
        throw new UserInvalidInputError(command.currentPassword);
      }

      const newHashedPassword = await this.hashTextUseCase
        .execute(new HashTextCommand(command.newPassword))
        .catch((error) => {
          if (error instanceof HashingError) {
            throw error;
          }
          this.logger.error('Password hashing failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw new UserInvalidInputError('Password hashing failed');
        });

      user.passwordHash = newHashedPassword;
      await this.usersRepository.update(user);
      return;
    } catch (error) {
      if (error instanceof UserError || error instanceof HashingError) {
        throw error;
      }
      this.logger.error('Password update failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UserInvalidInputError('Password update failed');
    }
  }
}
