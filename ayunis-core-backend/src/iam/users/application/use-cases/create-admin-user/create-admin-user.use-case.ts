import { Injectable, Logger } from '@nestjs/common';
import { CreateAdminUserCommand } from './create-admin-user.command';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import { CreateUserUseCase } from '../create-user/create-user.use-case';
import { CreateUserCommand } from '../create-user/create-user.command';

@Injectable()
export class CreateAdminUserUseCase {
  private readonly logger = new Logger(CreateAdminUserUseCase.name);

  constructor(private readonly createUserUseCase: CreateUserUseCase) {}

  async execute(command: CreateAdminUserCommand): Promise<User> {
    this.logger.log('createAdmin', {
      email: command.email,
      orgId: command.orgId,
    });

    const createUserCommand = new CreateUserCommand({
      email: command.email,
      password: command.password,
      orgId: command.orgId,
      name: command.name,
      role: UserRole.ADMIN,
      emailVerified: command.emailVerified,
    });

    return this.createUserUseCase.execute(createUserCommand);
  }
}
