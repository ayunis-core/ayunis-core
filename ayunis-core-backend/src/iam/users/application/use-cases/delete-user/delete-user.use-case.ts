import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { DeleteUserCommand } from './delete-user.command';
import { UserNotFoundError, UserUnauthorizedError } from '../../users.errors';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

@Injectable()
export class DeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    this.logger.log('deleteUser', { userId: command.userId });
    const requestUser = await this.usersRepository.findOneById(
      command.requestUserId,
    );
    if (!requestUser) {
      throw new UserNotFoundError(command.requestUserId);
    }
    if (
      requestUser.orgId !== command.orgId ||
      requestUser.role !== UserRole.ADMIN
    ) {
      throw new UserUnauthorizedError(
        'You are not allowed to delete this user',
      );
    }

    await this.usersRepository.delete(command.userId);
  }
}
