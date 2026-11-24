import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { RequireAcademyCertificate } from 'src/iam/academy-access/application/decorators/academy-certificate.decorator';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { McpIntegrationResponseDto } from 'src/domain/mcp/presenters/http/dto/mcp-integration-response.dto';
import { McpIntegrationDtoMapper } from 'src/domain/mcp/presenters/http/mappers/mcp-integration-dto.mapper';
import { AddMcpIntegrationToRoutineUseCase } from 'src/domain/routines/application/use-cases/add-mcp-integration-to-routine/add-mcp-integration-to-routine.use-case';
import { AddMcpIntegrationToRoutineCommand } from 'src/domain/routines/application/use-cases/add-mcp-integration-to-routine/add-mcp-integration-to-routine.command';
import { RemoveMcpIntegrationFromRoutineUseCase } from 'src/domain/routines/application/use-cases/remove-mcp-integration-from-routine/remove-mcp-integration-from-routine.use-case';
import { RemoveMcpIntegrationFromRoutineCommand } from 'src/domain/routines/application/use-cases/remove-mcp-integration-from-routine/remove-mcp-integration-from-routine.command';
import { ListRoutineMcpIntegrationsUseCase } from 'src/domain/routines/application/use-cases/list-routine-mcp-integrations/list-routine-mcp-integrations.use-case';
import { ListRoutineMcpIntegrationsQuery } from 'src/domain/routines/application/use-cases/list-routine-mcp-integrations/list-routine-mcp-integrations.query';

const ROUTINE_ID_PARAM = {
  name: 'routineId',
  description: 'The UUID of the routine',
  type: 'string',
  format: 'uuid',
} as const;

const INTEGRATION_ID_PARAM = {
  name: 'integrationId',
  description: 'The UUID of the integration',
  type: 'string',
  format: 'uuid',
} as const;

@ApiTags('routines')
@RequireFeature(FeatureFlag.Routines)
@RequireAcademyCertificate()
@RequirePermission(Permission.MANAGE_ROUTINES)
@ApiResponse({
  status: 403,
  description: 'The manage routines permission is required',
})
@Controller('routines')
export class RoutineMcpIntegrationsController {
  private readonly logger = new Logger(RoutineMcpIntegrationsController.name);

  constructor(
    private readonly listRoutineMcpIntegrationsUseCase: ListRoutineMcpIntegrationsUseCase,
    private readonly addMcpIntegrationToRoutineUseCase: AddMcpIntegrationToRoutineUseCase,
    private readonly removeMcpIntegrationFromRoutineUseCase: RemoveMcpIntegrationFromRoutineUseCase,
    private readonly mcpIntegrationDtoMapper: McpIntegrationDtoMapper,
  ) {}

  @Get(':routineId/mcp-integrations')
  @ApiOperation({
    summary: "List a routine's integrations",
    description:
      'Includes integrations that are no longer enabled or connected; a run fails until they are removed or usable again.',
  })
  @ApiParam(ROUTINE_ID_PARAM)
  @ApiResponse({ status: 200, type: [McpIntegrationResponseDto] })
  @ApiResponse({ status: 404, description: 'Routine not found' })
  async list(
    @Param('routineId', ParseUUIDPipe) routineId: UUID,
  ): Promise<McpIntegrationResponseDto[]> {
    this.logger.log({ routineId }, 'list');
    const integrations = await this.listRoutineMcpIntegrationsUseCase.execute(
      new ListRoutineMcpIntegrationsQuery(routineId),
    );
    return this.mcpIntegrationDtoMapper.toDtoArray(integrations);
  }

  @Post(':routineId/mcp-integrations/:integrationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Add an integration to a routine',
    description:
      'The integration must be enabled and connected for the user. Adding one the routine already has changes nothing.',
  })
  @ApiParam(ROUTINE_ID_PARAM)
  @ApiParam(INTEGRATION_ID_PARAM)
  @ApiResponse({ status: 204, description: 'Integration added' })
  @ApiResponse({ status: 404, description: 'Routine not found' })
  @ApiResponse({
    status: 422,
    description:
      'The integration is not enabled or not connected for the user (`ROUTINE_INTEGRATION_UNAVAILABLE`)',
  })
  async add(
    @Param('routineId', ParseUUIDPipe) routineId: UUID,
    @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
  ): Promise<void> {
    this.logger.log({ routineId, integrationId }, 'add');
    await this.addMcpIntegrationToRoutineUseCase.execute(
      new AddMcpIntegrationToRoutineCommand(routineId, integrationId),
    );
  }

  @Delete(':routineId/mcp-integrations/:integrationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an integration from a routine' })
  @ApiParam(ROUTINE_ID_PARAM)
  @ApiParam(INTEGRATION_ID_PARAM)
  @ApiResponse({ status: 204, description: 'Integration removed' })
  @ApiResponse({ status: 404, description: 'Routine not found' })
  async remove(
    @Param('routineId', ParseUUIDPipe) routineId: UUID,
    @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
  ): Promise<void> {
    this.logger.log({ routineId, integrationId }, 'remove');
    await this.removeMcpIntegrationFromRoutineUseCase.execute(
      new RemoveMcpIntegrationFromRoutineCommand(routineId, integrationId),
    );
  }
}
