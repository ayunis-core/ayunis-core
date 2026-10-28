import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import {
  UserAlreadyExistsError,
  UserUnexpectedError,
} from 'src/iam/users/application/users.errors';
import { CreateFederatedUserCommand } from 'src/iam/users/application/use-cases/create-federated-user/create-federated-user.command';
import { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class CreateFederatedUserUseCase {
  private readonly logger = new Logger(CreateFederatedUserUseCase.name);

  constructor(private readonly users: UsersRepository) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(command: CreateFederatedUserCommand): Promise<User> {
    this.logger.log(
      { orgId: command.orgId, role: command.role },
      'Creating federated user',
    );
    const existingUser = await this.users.findOneByEmail(command.email);
    if (existingUser) {
      throw new UserAlreadyExistsError(existingUser.id);
    }
    return this.users.create(
      new User({
        email: command.email,
        emailVerified: true,
        passwordHash: null,
        role: command.role,
        orgId: command.orgId,
        name: command.name,
        hasAcceptedMarketing: false,
      }),
    );
  }
}
