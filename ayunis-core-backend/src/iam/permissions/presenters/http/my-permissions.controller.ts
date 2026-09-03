import { Controller, Get, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from 'src/iam/authentication/application/decorators/current-user.decorator';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { GetMyPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-my-permissions/get-my-permissions.use-case';
import { GetMyPermissionsQuery } from 'src/iam/permissions/application/use-cases/get-my-permissions/get-my-permissions.query';
import { MyPermissionsResponseDto } from './dtos/my-permissions-response.dto';

@ApiTags('Permissions')
@Controller('permissions')
export class MyPermissionsController {
  private readonly logger = new Logger(MyPermissionsController.name);

  constructor(
    private readonly getMyPermissionsUseCase: GetMyPermissionsUseCase,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: "Get the current user's effective permissions",
  })
  @ApiResponse({ status: HttpStatus.OK, type: MyPermissionsResponseDto })
  async getMine(
    @CurrentUser() user: ActiveUser,
  ): Promise<MyPermissionsResponseDto> {
    this.logger.log({ userId: user.id }, 'getMine');

    const permissions = await this.getMyPermissionsUseCase.execute(
      new GetMyPermissionsQuery(user.orgId, user.role),
    );
    return { permissions };
  }
}
