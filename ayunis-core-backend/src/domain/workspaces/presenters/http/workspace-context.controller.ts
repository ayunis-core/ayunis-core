import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import type { UUID } from 'crypto';

import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { FeatureFlag } from 'src/config/features.config';
import { BuildWorkspaceRunContextUseCase } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.use-case';
import { BuildWorkspaceRunContextQuery } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.query';
import { UpdateWorkspaceInstructionUseCase } from 'src/domain/workspaces/application/use-cases/update-workspace-instruction/update-workspace-instruction.use-case';
import { UpdateWorkspaceInstructionCommand } from 'src/domain/workspaces/application/use-cases/update-workspace-instruction/update-workspace-instruction.command';
import { CreateWorkspaceSkillUseCase } from 'src/domain/workspaces/application/use-cases/create-workspace-skill/create-workspace-skill.use-case';
import { CreateWorkspaceSkillCommand } from 'src/domain/workspaces/application/use-cases/create-workspace-skill/create-workspace-skill.command';
import { DeleteWorkspaceSkillUseCase } from 'src/domain/workspaces/application/use-cases/delete-workspace-skill/delete-workspace-skill.use-case';
import { DeleteWorkspaceSkillCommand } from 'src/domain/workspaces/application/use-cases/delete-workspace-skill/delete-workspace-skill.command';
import { ListWorkspaceSkillsUseCase } from 'src/domain/workspaces/application/use-cases/list-workspace-skills/list-workspace-skills.use-case';
import { ListWorkspaceSkillsQuery } from 'src/domain/workspaces/application/use-cases/list-workspace-skills/list-workspace-skills.query';
import { WorkspaceContextDtoMapper } from 'src/domain/workspaces/presenters/http/mappers/workspace-context-dto.mapper';
import { WorkspaceDtoMapper } from 'src/domain/workspaces/presenters/http/mappers/workspace-dto.mapper';
import { UpdateWorkspaceInstructionDto } from 'src/domain/workspaces/presenters/http/dtos/update-workspace-instruction.dto';
import { WorkspaceContextListQueryDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-context-list-query.dto';
import { CreateWorkspaceSkillDto } from 'src/domain/workspaces/presenters/http/dtos/create-workspace-skill.dto';
import {
  WorkspaceContextResponseDto,
  WorkspaceSkillListResponseDto,
  WorkspaceSkillResponseDto,
} from 'src/domain/workspaces/presenters/http/dtos/workspace-context-response.dto';
import { WorkspaceResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-response.dto';
import { GetWorkspaceSkillUseCase } from 'src/domain/workspaces/application/use-cases/get-workspace-skill/get-workspace-skill.use-case';
import { UpdateWorkspaceSkillUseCase } from 'src/domain/workspaces/application/use-cases/update-workspace-skill/update-workspace-skill.use-case';
import { SetWorkspaceSkillActivationUseCase } from 'src/domain/workspaces/application/use-cases/set-workspace-skill-activation/set-workspace-skill-activation.use-case';
import { SetWorkspaceSkillPinUseCase } from 'src/domain/workspaces/application/use-cases/set-workspace-skill-pin/set-workspace-skill-pin.use-case';
import { SetWorkspaceSkillKnowledgeBaseUseCase } from 'src/domain/workspaces/application/use-cases/set-workspace-skill-knowledge-base/set-workspace-skill-knowledge-base.use-case';
import {
  UpdateWorkspaceSkillActivationDto,
  UpdateWorkspaceSkillPinDto,
} from './dtos/update-workspace-skill-state.dto';

@ApiTags('workspaces')
@Controller('workspaces/:id/context')
@RequireFeature(FeatureFlag.Workspaces)
export class WorkspaceContextController {
  constructor(
    private readonly buildWorkspaceRunContextUseCase: BuildWorkspaceRunContextUseCase,
    private readonly updateWorkspaceInstructionUseCase: UpdateWorkspaceInstructionUseCase,
    private readonly createWorkspaceSkillUseCase: CreateWorkspaceSkillUseCase,
    private readonly getSkill: GetWorkspaceSkillUseCase,
    private readonly updateSkillUseCase: UpdateWorkspaceSkillUseCase,
    private readonly activateSkill: SetWorkspaceSkillActivationUseCase,
    private readonly pinSkill: SetWorkspaceSkillPinUseCase,
    private readonly assignKnowledgeBase: SetWorkspaceSkillKnowledgeBaseUseCase,
    private readonly deleteWorkspaceSkillUseCase: DeleteWorkspaceSkillUseCase,
    private readonly listWorkspaceSkillsUseCase: ListWorkspaceSkillsUseCase,
    private readonly contextDtoMapper: WorkspaceContextDtoMapper,
    private readonly workspaceDtoMapper: WorkspaceDtoMapper,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get workspace context' })
  @ApiResponse({ status: 200, type: WorkspaceContextResponseDto })
  async findContext(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<WorkspaceContextResponseDto> {
    const context = await this.buildWorkspaceRunContextUseCase.execute(
      new BuildWorkspaceRunContextQuery(id),
    );
    return this.contextDtoMapper.toContextDto(context);
  }

  @Post('skills')
  @RequirePermission(Permission.MANAGE_SKILLS)
  @ApiResponse({ status: 201, type: WorkspaceSkillResponseDto })
  async createSkill(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: CreateWorkspaceSkillDto,
  ): Promise<WorkspaceSkillResponseDto> {
    const skill = await this.createWorkspaceSkillUseCase.execute(
      new CreateWorkspaceSkillCommand(
        id,
        dto.name,
        dto.shortDescription,
        dto.instructions,
      ),
    );
    return this.contextDtoMapper.toSkillDto(skill);
  }

  @Get('skills/:skillId')
  @ApiResponse({ status: 200, type: WorkspaceSkillResponseDto })
  async findSkill(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
  ): Promise<WorkspaceSkillResponseDto> {
    return this.contextDtoMapper.toSkillDto(
      await this.getSkill.execute({ workspaceId: id, skillId }),
    );
  }

  @Patch('skills/:skillId')
  @RequirePermission(Permission.MANAGE_SKILLS)
  @ApiResponse({ status: 200, type: WorkspaceSkillResponseDto })
  async updateSkill(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
    @Body() dto: CreateWorkspaceSkillDto,
  ): Promise<WorkspaceSkillResponseDto> {
    return this.contextDtoMapper.toSkillDto(
      await this.updateSkillUseCase.execute({
        workspaceId: id,
        skillId,
        values: dto,
      }),
    );
  }

  @Patch('skills/:skillId/activation')
  @RequirePermission(Permission.MANAGE_SKILLS)
  @ApiResponse({ status: 200, type: WorkspaceSkillResponseDto })
  async setSkillActivation(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
    @Body() dto: UpdateWorkspaceSkillActivationDto,
  ): Promise<WorkspaceSkillResponseDto> {
    return this.contextDtoMapper.toSkillDto(
      await this.activateSkill.execute({
        workspaceId: id,
        skillId,
        isActive: dto.isActive,
      }),
    );
  }

  @Patch('skills/:skillId/pin')
  @RequirePermission(Permission.MANAGE_SKILLS)
  @ApiResponse({ status: 200, type: WorkspaceSkillResponseDto })
  async setSkillPin(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
    @Body() dto: UpdateWorkspaceSkillPinDto,
  ): Promise<WorkspaceSkillResponseDto> {
    return this.contextDtoMapper.toSkillDto(
      await this.pinSkill.execute({
        workspaceId: id,
        skillId,
        isPinned: dto.isPinned,
      }),
    );
  }

  @Post('skills/:skillId/knowledge-bases/:knowledgeBaseId')
  @RequirePermission(Permission.MANAGE_SKILLS)
  @ApiResponse({ status: 201, type: WorkspaceSkillResponseDto })
  async assignSkillKnowledgeBase(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: UUID,
  ): Promise<WorkspaceSkillResponseDto> {
    return this.contextDtoMapper.toSkillDto(
      await this.assignKnowledgeBase.execute({
        workspaceId: id,
        skillId,
        knowledgeBaseId,
        assigned: true,
      }),
    );
  }

  @Delete('skills/:skillId/knowledge-bases/:knowledgeBaseId')
  @RequirePermission(Permission.MANAGE_SKILLS)
  @ApiResponse({ status: 200, type: WorkspaceSkillResponseDto })
  async unassignSkillKnowledgeBase(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: UUID,
  ): Promise<WorkspaceSkillResponseDto> {
    return this.contextDtoMapper.toSkillDto(
      await this.assignKnowledgeBase.execute({
        workspaceId: id,
        skillId,
        knowledgeBaseId,
        assigned: false,
      }),
    );
  }

  @Delete('skills/:skillId')
  @RequirePermission(Permission.MANAGE_SKILLS)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSkill(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
  ): Promise<void> {
    await this.deleteWorkspaceSkillUseCase.execute(
      new DeleteWorkspaceSkillCommand(id, skillId),
    );
  }

  @Get('skills')
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, default: 0 })
  @ApiResponse({ status: 200, type: WorkspaceSkillListResponseDto })
  async listSkills(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Query() queryParams: WorkspaceContextListQueryDto,
  ): Promise<WorkspaceSkillListResponseDto> {
    const page = await this.listWorkspaceSkillsUseCase.execute(
      new ListWorkspaceSkillsQuery({
        workspaceId: id,
        ...queryParams.toQuery(),
      }),
    );
    return this.contextDtoMapper.toSkillListDto(page);
  }

  @Patch('instruction')
  @ApiResponse({ status: 200, type: WorkspaceResponseDto })
  async updateInstruction(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateWorkspaceInstructionDto,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.updateWorkspaceInstructionUseCase.execute(
      new UpdateWorkspaceInstructionCommand(id, dto.instruction),
    );
    return this.workspaceDtoMapper.toDto(workspace);
  }
}
