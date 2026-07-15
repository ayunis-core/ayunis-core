import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { SystemRole } from '../../../domain/value-objects/system-role.enum';
import { UserUnexpectedError } from '../../users.errors';

@Injectable()
export class FindSuperAdminsUseCase {
  private readonly logger = new Logger(FindSuperAdminsUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(): Promise<User[]> {
    this.logger.log('execute');

    return await this.usersRepository.findManyBySystemRole(
      SystemRole.SUPER_ADMIN,
    );
  }
}
