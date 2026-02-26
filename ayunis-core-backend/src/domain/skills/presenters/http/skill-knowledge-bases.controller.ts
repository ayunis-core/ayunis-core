import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AssignKnowledgeBaseToSkillUseCase } from '../../application/use-cases/assign-knowledge-base-to-skill/assign-knowledge-base-to-skill.use-case';
import { UnassignKnowledgeBaseFromSkillUseCase } from '../../application/use-cases/unassign-knowledge-base-from-skill/unassign-knowledge-base-from-skill.use-case';
import { ListSkillKnowledgeBasesUseCase } from '../../application/use-cases/list-skill-knowledge-bases/list-skill-knowledge-bases.use-case';

import { AssignKnowledgeBaseToSkillCommand } from '../../application/use-cases/assign-knowledge-base-to-skill/assign-knowledge-base-to-skill.command';
import { UnassignKnowledgeBaseFromSkillCommand } from '../../application/use-cases/unassign-knowledge-base-from-skill/unassign-knowledge-base-from-skill.command';
import { ListSkillKnowledgeBasesQuery } from '../../application/use-cases/list-skill-knowledge-bases/list-skill-knowledge-bases.query';

import { SkillAccessService } from '../../application/services/skill-access.service';

import { SkillResponseDto } from './dto/skill-response.dto';
import { SkillDtoMapper } from './mappers/skill.mapper';
import { KnowledgeBaseResponseDto } from 'src/domain/knowledge-bases/presenters/http/dto/knowledge-base-response.dto';
import { KnowledgeBaseDtoMapper } from 'src/domain/knowledge-bases/presenters/http/mappers/knowledge-base-dto.mapper';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';

@ApiTags('skills')
@RequireFeature(FeatureFlag.Skills)
@RequireFeature(FeatureFlag.KnowledgeBases)
@Controller('skills')
export class SkillKnowledgeBasesController {
  private readonly logger = new Logger(SkillKnowledgeBasesController.name);

  constructor(
    private readonly assignKnowledgeBaseToSkillUseCase: AssignKnowledgeBaseToSkillUseCase,
    private readonly unassignKnowledgeBaseFromSkillUseCase: UnassignKnowledgeBaseFromSkillUseCase,
    private readonly listSkillKnowledgeBasesUseCase: ListSkillKnowledgeBasesUseCase,
    private readonly skillDtoMapper: SkillDtoMapper,
    private readonly knowledgeBaseDtoMapper: KnowledgeBaseDtoMapper,
    private readonly skillAccessService: SkillAccessService,
  ) {}

  @Post(':skillId/knowledge-bases/:knowledgeBaseId')
  @ApiOperation({ summary: 'Assign knowledge base to skill' })
  @ApiParam({
    name: 'skillId',
    description: 'The UUID of the skill',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'knowledgeBaseId',
    description: 'The UUID of the knowledge base to assign',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'The knowledge base has been successfully assigned',
    type: SkillResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Skill or knowledge base not found',
  })
  @ApiResponse({ status: 409, description: 'Knowledge base already assigned' })
  @HttpCode(HttpStatus.CREATED)
  async assignKnowledgeBase(
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: UUID,
  ): Promise<SkillResponseDto> {
    this.logger.log('assignKnowledgeBase', { skillId, knowledgeBaseId });

    const skill = await this.assignKnowledgeBaseToSkillUseCase.execute(
      new AssignKnowledgeBaseToSkillCommand(skillId, knowledgeBaseId),
    );

    const context = await this.skillAccessService.resolveUserContext(skillId);

    return this.skillDtoMapper.toDto(skill, context);
  }

  @Delete(':skillId/knowledge-bases/:knowledgeBaseId')
  @ApiOperation({ summary: 'Unassign knowledge base from skill' })
  @ApiParam({
    name: 'skillId',
    description: 'The UUID of the skill',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'knowledgeBaseId',
    description: 'The UUID of the knowledge base to unassign',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'The knowledge base has been successfully unassigned',
    type: SkillResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Skill not found or knowledge base not assigned',
  })
  async unassignKnowledgeBase(
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: UUID,
  ): Promise<SkillResponseDto> {
    this.logger.log('unassignKnowledgeBase', { skillId, knowledgeBaseId });

    const skill = await this.unassignKnowledgeBaseFromSkillUseCase.execute(
      new UnassignKnowledgeBaseFromSkillCommand(skillId, knowledgeBaseId),
    );

    const context = await this.skillAccessService.resolveUserContext(skillId);

    return this.skillDtoMapper.toDto(skill, context);
  }

  @Get(':skillId/knowledge-bases')
  @ApiOperation({ summary: 'List knowledge bases assigned to skill' })
  @ApiParam({
    name: 'skillId',
    description: 'The UUID of the skill',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all knowledge bases assigned to the skill',
    type: [KnowledgeBaseResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async listSkillKnowledgeBases(
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
  ): Promise<KnowledgeBaseResponseDto[]> {
    this.logger.log('listSkillKnowledgeBases', { skillId });

    const knowledgeBases = await this.listSkillKnowledgeBasesUseCase.execute(
      new ListSkillKnowledgeBasesQuery(skillId),
    );

    return this.knowledgeBaseDtoMapper.toDtoArray(knowledgeBases);
  }
}
