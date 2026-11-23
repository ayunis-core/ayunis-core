import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { AddOparlSystemCommand } from 'src/domain/oparl/application/use-cases/add-oparl-system/add-oparl-system.command';
import { AddOparlSystemUseCase } from 'src/domain/oparl/application/use-cases/add-oparl-system/add-oparl-system.use-case';
import { ListOparlSystemsUseCase } from 'src/domain/oparl/application/use-cases/list-oparl-systems/list-oparl-systems.use-case';
import { SyncOparlSystemNowCommand } from 'src/domain/oparl/application/use-cases/sync-oparl-system-now/sync-oparl-system-now.command';
import { SyncOparlSystemNowUseCase } from 'src/domain/oparl/application/use-cases/sync-oparl-system-now/sync-oparl-system-now.use-case';
import { AddOparlSystemDto } from './dto/add-oparl-system.dto';
import { OparlSystemResponseDto } from './dto/oparl-system-response.dto';
import { toOparlSystemResponseDto } from './mappers/oparl-system-dto.mapper';

@ApiTags('Super Admin OParl')
@Controller('super-admin/oparl/systems')
@SystemRoles(SystemRole.SUPER_ADMIN)
@RequireFeature(FeatureFlag.Oparl)
@ApiForbiddenResponse({ description: 'Not a super admin' })
@ApiNotFoundResponse({ description: 'OParl is disabled' })
export class SuperAdminOparlSystemsController {
  constructor(
    private readonly listSystems: ListOparlSystemsUseCase,
    private readonly addSystem: AddOparlSystemUseCase,
    private readonly syncNow: SyncOparlSystemNowUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List the OParl systems in the catalog',
    description:
      'Each system with its bodies, sync state and health, and the mirrored objects per type.',
  })
  @ApiOkResponse({ type: [OparlSystemResponseDto] })
  async list(): Promise<OparlSystemResponseDto[]> {
    const overviews = await this.listSystems.execute();
    return overviews.map(toOparlSystemResponseDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add an OParl system by its URL',
    description:
      'The URL must lead to an OParl System object on a public http(s) host. Its bodies are discovered and the initial import starts.',
  })
  @ApiBody({ type: AddOparlSystemDto })
  @ApiCreatedResponse({ type: OparlSystemResponseDto })
  @ApiBadRequestResponse({
    description:
      'Not an http(s) URL (OPARL_INVALID_SYSTEM_URL), or not on a public host (OPARL_HOST_BLOCKED)',
  })
  @ApiConflictResponse({
    description:
      'The system is already in the catalog (OPARL_SYSTEM_ALREADY_EXISTS)',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'Unreachable (OPARL_REQUEST_FAILED), or no OParl System (OPARL_NOT_AN_OPARL_SYSTEM, OPARL_INVALID_RESPONSE)',
  })
  async add(@Body() dto: AddOparlSystemDto): Promise<OparlSystemResponseDto> {
    const overview = await this.addSystem.execute(
      new AddOparlSystemCommand(dto.url),
    );
    return toOparlSystemResponseDto(overview);
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Sync an OParl system now',
    description: 'Queues a sync unless one is queued or running.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiAcceptedResponse({ description: 'Sync queued' })
  async sync(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    await this.syncNow.execute(new SyncOparlSystemNowCommand(id));
  }
}
