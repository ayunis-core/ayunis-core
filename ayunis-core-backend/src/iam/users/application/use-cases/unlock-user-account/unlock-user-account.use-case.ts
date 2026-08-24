import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import {
  UserNotFoundError,
  UserUnauthorizedError,
  UserUnexpectedError,
} from 'src/iam/users/application/users.errors';
import { UnlockUserAccountCommand } from 'src/iam/users/application/use-cases/unlock-user-account/unlock-user-account.command';
import type { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@Injectable()
export class UnlockUserAccountUseCase {
  constructor(
    @InjectPinoLogger(UnlockUserAccountUseCase.name)
    private readonly logger: PinoLogger,
    private readonly contextService: ContextService,
    private readonly usersRepository: UsersRepository,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(command: UnlockUserAccountCommand): Promise<void> {
    this.logger.info({ userId: command.userId }, 'unlockUserAccount');
    const isSuperAdmin =
      this.contextService.get('systemRole') === SystemRole.SUPER_ADMIN;
    const user = await this.usersRepository.findOneById(command.userId);
    if (
      !user ||
      (!isSuperAdmin && user.orgId !== this.contextService.get('orgId'))
    ) {
      throw new UserNotFoundError(command.userId);
    }
    this.assertAuthorized(user, isSuperAdmin);

    if (!(await this.usersRepository.clearLoginLock(command.userId))) {
      throw new UserNotFoundError(command.userId);
    }
    this.logger.info({ userId: command.userId }, 'User account unlocked');
  }

  private assertAuthorized(user: User, isSuperAdmin: boolean): void {
    const isOrgAdmin =
      this.contextService.get('role') === UserRole.ADMIN &&
      this.contextService.get('orgId') === user.orgId;
    const isSelfUnlock = this.contextService.get('userId') === user.id;
    if ((!isSuperAdmin && !isOrgAdmin) || isSelfUnlock) {
      throw new UserUnauthorizedError(
        'You are not allowed to unlock this user',
      );
    }
  }
}
