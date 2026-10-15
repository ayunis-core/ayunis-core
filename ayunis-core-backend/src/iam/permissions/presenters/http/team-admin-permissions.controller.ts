import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { GetTeamAdminPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-team-admin-permissions/get-team-admin-permissions.use-case';
import { UpdateTeamAdminPermissionsUseCase } from 'src/iam/permissions/application/use-cases/update-team-admin-permissions/update-team-admin-permissions.use-case';
import { UpdateTeamAdminPermissionsCommand } from 'src/iam/permissions/application/use-cases/update-team-admin-permissions/update-team-admin-permissions.command';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import {
  TeamAdminPermissionsResponseDto,
  UpdateTeamAdminPermissionsDto,
} from './dtos/team-admin-permissions.dto';

@ApiTags('Role Permissions')
@Controller('team-admin-permissions')
@Roles(UserRole.ADMIN)
export class TeamAdminPermissionsController {
  private readonly logger = new Logger(TeamAdminPermissionsController.name);

  constructor(
    private readonly getTeamAdminPermissionsUseCase: GetTeamAdminPermissionsUseCase,
    private readonly updateTeamAdminPermissionsUseCase: UpdateTeamAdminPermissionsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get what team admins may do in their teams' })
  @ApiResponse({ status: HttpStatus.OK, type: TeamAdminPermissionsResponseDto })
  async get(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<TeamAdminPermissionsResponseDto> {
    this.logger.log({ orgId }, 'get');
    const permissions =
      await this.getTeamAdminPermissionsUseCase.execute(orgId);
    return { permissions };
  }

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Replace what team admins may do in their teams' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async update(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() dto: UpdateTeamAdminPermissionsDto,
  ): Promise<void> {
    this.logger.log({ orgId, count: dto.permissions.length }, 'update');
    await this.updateTeamAdminPermissionsUseCase.execute(
      new UpdateTeamAdminPermissionsCommand(orgId, dto.permissions),
    );
  }
}
