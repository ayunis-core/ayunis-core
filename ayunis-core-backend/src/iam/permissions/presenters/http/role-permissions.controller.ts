import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseEnumPipe,
  Put,
} from '@nestjs/common';
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
  private readonly logger = new Logger(RolePermissionsController.name);

  constructor(
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
    this.logger.log('get', { orgId });

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
    this.logger.log('update', { orgId, role, count: dto.permissions.length });

    await this.updateRolePermissionsUseCase.execute(
      new UpdateRolePermissionsCommand(orgId, role, dto.permissions),
    );
  }
}
