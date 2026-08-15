import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CreateAdminUserCommand } from './create-admin-user.command';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { CreateUserUseCase } from '../create-user/create-user.use-case';
import { CreateUserCommand } from '../create-user/create-user.command';

@Injectable()
export class CreateAdminUserUseCase {
  constructor(
    @InjectPinoLogger(CreateAdminUserUseCase.name)
    private readonly logger: PinoLogger,
    private readonly createUserUseCase: CreateUserUseCase,
  ) {}

  async execute(command: CreateAdminUserCommand): Promise<User> {
    this.logger.info(
      {
        email: command.email,
        orgId: command.orgId,
      },
      'createAdmin',
    );

    const createUserCommand = new CreateUserCommand({
      email: command.email,
      password: command.password,
      orgId: command.orgId,
      name: command.name,
      role: UserRole.ADMIN,
      emailVerified: command.emailVerified,
      hasAcceptedMarketing: command.hasAcceptedMarketing,
      department: command.department,
    });

    return this.createUserUseCase.execute(createUserCommand);
  }
}
