import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Put,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { GetRolePermissionsUseCase } from '../../application/use-cases/get-role-permissions/get-role-permissions.use-case';
import { GetRolePermissionsQuery } from '../../application/use-cases/get-role-permissions/get-role-permissions.query';
import { UpdateRolePermissionsUseCase } from '../../application/use-cases/update-role-permissions/update-role-permissions.use-case';
import { UpdateRolePermissionsCommand } from '../../application/use-cases/update-role-permissions/update-role-permissions.command';
import { RolePermissionsResponseDto } from './dtos/role-permissions-response.dto';
import { UpdateRolePermissionsDto } from './dtos/update-role-permissions.dto';

@ApiTags('Role Permissions')
@Controller('role-permissions')
@Roles(UserRole.ADMIN)
export class RolePermissionsController {
  constructor(
    @InjectPinoLogger(RolePermissionsController.name)
    private readonly logger: PinoLogger,
    private readonly getRolePermissionsUseCase: GetRolePermissionsUseCase,
    private readonly updateRolePermissionsUseCase: UpdateRolePermissionsUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Get the per-role permission grants for the current user's organization",
  })
  @ApiResponse({ status: HttpStatus.OK, type: RolePermissionsResponseDto })
  async get(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<RolePermissionsResponseDto> {
    this.logger.info({ orgId }, 'get');

    const roles = await this.getRolePermissionsUseCase.execute(
      new GetRolePermissionsQuery(orgId),
    );

    return { roles };
  }

  @Put(':role')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Replace the permissions granted to a role' })
  @ApiParam({ name: 'role', enum: [UserRole.MANAGER, UserRole.USER] })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async update(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Param('role', new ParseEnumPipe(UserRole)) role: UserRole,
    @Body() dto: UpdateRolePermissionsDto,
  ): Promise<void> {
    this.logger.info({ orgId, role, count: dto.permissions.length }, 'update');

    await this.updateRolePermissionsUseCase.execute(
      new UpdateRolePermissionsCommand(orgId, role, dto.permissions),
    );
  }
}
