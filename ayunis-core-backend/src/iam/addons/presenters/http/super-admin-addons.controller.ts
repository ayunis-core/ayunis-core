import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Post,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { AddonType } from '../../domain/value-objects/addon-type.enum';
import { ListOrgAddonsUseCase } from '../../application/use-cases/list-org-addons/list-org-addons.use-case';
import { ListOrgAddonsQuery } from '../../application/use-cases/list-org-addons/list-org-addons.query';
import { ActivateAddonUseCase } from '../../application/use-cases/activate-addon/activate-addon.use-case';
import { ActivateAddonCommand } from '../../application/use-cases/activate-addon/activate-addon.command';
import { DeactivateAddonUseCase } from '../../application/use-cases/deactivate-addon/deactivate-addon.use-case';
import { DeactivateAddonCommand } from '../../application/use-cases/deactivate-addon/deactivate-addon.command';
import { AddonStatusResponseDto } from './dto/addon-status-response.dto';

@ApiTags('Super Admin Addons')
@Controller('super-admin/addons')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminAddonsController {
  constructor(
    @InjectPinoLogger(SuperAdminAddonsController.name)
    private readonly logger: PinoLogger,
    private readonly listOrgAddonsUseCase: ListOrgAddonsUseCase,
    private readonly activateAddonUseCase: ActivateAddonUseCase,
    private readonly deactivateAddonUseCase: DeactivateAddonUseCase,
  ) {}

  @Get(':orgId')
  @ApiOperation({
    summary: 'List all add-ons with their active state for an organization',
  })
  @ApiParam({ name: 'orgId', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: [AddonStatusResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Not authorized as super admin' })
  async list(@Param('orgId') orgId: UUID): Promise<AddonStatusResponseDto[]> {
    this.logger.info({ orgId }, 'list');

    const statuses = await this.listOrgAddonsUseCase.execute(
      new ListOrgAddonsQuery(orgId),
    );
    return statuses.map((status) => this.toDto(status));
  }

  @Post(':orgId/:type')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Activate an add-on for an organization' })
  @ApiParam({ name: 'orgId', format: 'uuid' })
  @ApiParam({ name: 'type', enum: AddonType })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Add-on active' })
  @ApiUnauthorizedResponse({ description: 'Not authorized as super admin' })
  async activate(
    @Param('orgId') orgId: UUID,
    @Param('type', new ParseEnumPipe(AddonType)) type: AddonType,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<void> {
    this.logger.info({ orgId, type }, 'activate');

    await this.activateAddonUseCase.execute(
      new ActivateAddonCommand(orgId, type, userId),
    );
  }

  @Delete(':orgId/:type')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate an add-on for an organization' })
  @ApiParam({ name: 'orgId', format: 'uuid' })
  @ApiParam({ name: 'type', enum: AddonType })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Add-on inactive',
  })
  @ApiUnauthorizedResponse({ description: 'Not authorized as super admin' })
  async deactivate(
    @Param('orgId') orgId: UUID,
    @Param('type', new ParseEnumPipe(AddonType)) type: AddonType,
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<void> {
    this.logger.info({ orgId, type }, 'deactivate');

    await this.deactivateAddonUseCase.execute(
      new DeactivateAddonCommand(orgId, type, userId),
    );
  }

  private toDto(status: {
    type: AddonType;
    active: boolean;
  }): AddonStatusResponseDto {
    return {
      type: status.type,
      active: status.active,
    };
  }
}
