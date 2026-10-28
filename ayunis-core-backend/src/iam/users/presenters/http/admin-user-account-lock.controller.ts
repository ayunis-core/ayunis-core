import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UnlockUserAccountCommand } from 'src/iam/users/application/use-cases/unlock-user-account/unlock-user-account.command';
import { UnlockUserAccountUseCase } from 'src/iam/users/application/use-cases/unlock-user-account/unlock-user-account.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

@ApiTags('Users')
@Controller('users')
export class AdminUserAccountLockController {
  constructor(
    private readonly unlockUserAccountUseCase: UnlockUserAccountUseCase,
  ) {}

  @Roles(UserRole.ADMIN)
  @Patch(':userId/unlock')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlock a user in the current organization' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'User account unlocked' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'Requester is not authenticated' })
  @ApiForbiddenResponse({
    description: 'Requester is not an admin in the target organization',
  })
  async unlock(@Param('userId', ParseUUIDPipe) userId: UUID): Promise<void> {
    await this.unlockUserAccountUseCase.execute(
      new UnlockUserAccountCommand(userId),
    );
  }
}
