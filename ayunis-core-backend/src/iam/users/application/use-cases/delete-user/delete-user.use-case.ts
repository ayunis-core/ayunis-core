import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { DeleteUserCommand } from './delete-user.command';

@Injectable()
export class DeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    this.logger.log('deleteUser', { userId: command.userId });
    await this.usersRepository.delete(command.userId);
  }
}
