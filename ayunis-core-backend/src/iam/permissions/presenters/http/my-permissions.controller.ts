import { Controller, Get, HttpStatus } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from 'src/iam/authentication/application/decorators/current-user.decorator';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { GetMyPermissionsUseCase } from '../../application/use-cases/get-my-permissions/get-my-permissions.use-case';
import { GetMyPermissionsQuery } from '../../application/use-cases/get-my-permissions/get-my-permissions.query';
import { MyPermissionsResponseDto } from './dtos/my-permissions-response.dto';

@ApiTags('Permissions')
@Controller('permissions')
export class MyPermissionsController {
  constructor(
    @InjectPinoLogger(MyPermissionsController.name)
    private readonly logger: PinoLogger,
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
    this.logger.info({ userId: user.id }, 'getMine');

    const permissions = await this.getMyPermissionsUseCase.execute(
      new GetMyPermissionsQuery(user.orgId, user.role),
    );
    return { permissions };
  }
}
