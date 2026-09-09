import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { BuildWorkspaceRunContextQuery } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.query';
import { BuildWorkspaceRunContextUseCase } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.use-case';
import { UpdateWorkspaceInstructionCommand } from 'src/domain/workspaces/application/use-cases/update-workspace-instruction/update-workspace-instruction.command';
import { UpdateWorkspaceInstructionUseCase } from 'src/domain/workspaces/application/use-cases/update-workspace-instruction/update-workspace-instruction.use-case';
import { UpdateWorkspaceInstructionDto } from 'src/domain/workspaces/presenters/http/dtos/update-workspace-instruction.dto';
import { WorkspaceContextResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-context-response.dto';
import { WorkspaceResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-response.dto';
import { WorkspaceContextDtoMapper } from 'src/domain/workspaces/presenters/http/mappers/workspace-context-dto.mapper';
import { WorkspaceDtoMapper } from 'src/domain/workspaces/presenters/http/mappers/workspace-dto.mapper';

@ApiTags('workspaces')
@Controller('workspaces/:id/context')
@RequireFeature(FeatureFlag.Workspaces)
export class WorkspaceContextController {
  constructor(
    private readonly buildRunContext: BuildWorkspaceRunContextUseCase,
    private readonly updateWorkspaceInstruction: UpdateWorkspaceInstructionUseCase,
    private readonly contextMapper: WorkspaceContextDtoMapper,
    private readonly workspaceMapper: WorkspaceDtoMapper,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get workspace context' })
  @ApiResponse({ status: 200, type: WorkspaceContextResponseDto })
  async findContext(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<WorkspaceContextResponseDto> {
    const context = await this.buildRunContext.execute(
      new BuildWorkspaceRunContextQuery(id),
    );
    return this.contextMapper.toContextDto(context);
  }

  @Patch('instruction')
  @ApiResponse({ status: 200, type: WorkspaceResponseDto })
  async updateInstruction(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateWorkspaceInstructionDto,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.updateWorkspaceInstruction.execute(
      new UpdateWorkspaceInstructionCommand(id, dto.instruction),
    );
    return this.workspaceMapper.toDto(workspace);
  }
}
