import { Injectable, Logger } from '@nestjs/common';
import { CreateRegularUserCommand } from './create-regular-user.command';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import { CreateUserUseCase } from '../create-user/create-user.use-case';
import { CreateUserCommand } from '../create-user/create-user.command';

@Injectable()
export class CreateRegularUserUseCase {
  private readonly logger = new Logger(CreateRegularUserUseCase.name);

  constructor(private readonly createUserUseCase: CreateUserUseCase) {}

  async execute(command: CreateRegularUserCommand): Promise<User> {
    this.logger.log('createUser', {
      email: command.email,
      orgId: command.orgId,
      name: command.name,
    });

    const createUserCommand = new CreateUserCommand({
      email: command.email,
      password: command.password,
      orgId: command.orgId,
      name: command.name,
      role: UserRole.USER,
      emailVerified: command.emailVerified,
    });

    return this.createUserUseCase.execute(createUserCommand);
  }
}
