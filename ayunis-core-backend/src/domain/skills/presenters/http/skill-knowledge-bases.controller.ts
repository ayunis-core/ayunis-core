import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UUID } from 'crypto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AssignKnowledgeBaseToSkillUseCase } from 'src/domain/skills/application/use-cases/assign-knowledge-base-to-skill/assign-knowledge-base-to-skill.use-case';
import { UnassignKnowledgeBaseFromSkillUseCase } from 'src/domain/skills/application/use-cases/unassign-knowledge-base-from-skill/unassign-knowledge-base-from-skill.use-case';
import { ListSkillKnowledgeBasesUseCase } from 'src/domain/skills/application/use-cases/list-skill-knowledge-bases/list-skill-knowledge-bases.use-case';

import { AssignKnowledgeBaseToSkillCommand } from 'src/domain/skills/application/use-cases/assign-knowledge-base-to-skill/assign-knowledge-base-to-skill.command';
import { UnassignKnowledgeBaseFromSkillCommand } from 'src/domain/skills/application/use-cases/unassign-knowledge-base-from-skill/unassign-knowledge-base-from-skill.command';
import { ListSkillKnowledgeBasesQuery } from 'src/domain/skills/application/use-cases/list-skill-knowledge-bases/list-skill-knowledge-bases.query';

import { SkillAccessService } from 'src/domain/skills/application/services/skill-access.service';
import { SkillCreatorNameService } from 'src/domain/skills/application/services/skill-creator-name.service';

import { SkillResponseDto } from './dto/skill-response.dto';
import { SkillDtoMapper } from './mappers/skill.mapper';
import { KnowledgeBaseResponseDto } from 'src/domain/knowledge-bases/presenters/http/dto/knowledge-base-response.dto';
import { KnowledgeBaseDtoMapper } from 'src/domain/knowledge-bases/presenters/http/mappers/knowledge-base-dto.mapper';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

@ApiTags('skills')
@RequireFeature(FeatureFlag.Skills)
@RequireFeature(FeatureFlag.KnowledgeBases)
@Controller('skills')
export class SkillKnowledgeBasesController {
  constructor(
    @InjectPinoLogger(SkillKnowledgeBasesController.name)
    private readonly logger: PinoLogger,
    private readonly assignKnowledgeBaseToSkillUseCase: AssignKnowledgeBaseToSkillUseCase,
    private readonly unassignKnowledgeBaseFromSkillUseCase: UnassignKnowledgeBaseFromSkillUseCase,
    private readonly listSkillKnowledgeBasesUseCase: ListSkillKnowledgeBasesUseCase,
    private readonly skillDtoMapper: SkillDtoMapper,
    private readonly knowledgeBaseDtoMapper: KnowledgeBaseDtoMapper,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
    private readonly skillAccessService: SkillAccessService,
    private readonly skillCreatorNameService: SkillCreatorNameService,
  ) {}

  @RequirePermission(Permission.MANAGE_SKILLS)
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
    this.logger.info({ skillId, knowledgeBaseId }, 'assignKnowledgeBase');

    const skill = await this.assignKnowledgeBaseToSkillUseCase.execute(
      new AssignKnowledgeBaseToSkillCommand(skillId, knowledgeBaseId),
    );

    const context = await this.skillAccessService.resolveUserContext(skillId);
    const creatorName = context.isShared
      ? await this.skillCreatorNameService.resolveOne(skill.userId)
      : null;

    return this.skillDtoMapper.toDto(skill, context, creatorName);
  }

  @RequirePermission(Permission.MANAGE_SKILLS)
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
    this.logger.info({ skillId, knowledgeBaseId }, 'unassignKnowledgeBase');

    const skill = await this.unassignKnowledgeBaseFromSkillUseCase.execute(
      new UnassignKnowledgeBaseFromSkillCommand(skillId, knowledgeBaseId),
    );

    const context = await this.skillAccessService.resolveUserContext(skillId);
    const creatorName = context.isShared
      ? await this.skillCreatorNameService.resolveOne(skill.userId)
      : null;

    return this.skillDtoMapper.toDto(skill, context, creatorName);
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
    this.logger.info({ skillId }, 'listSkillKnowledgeBases');

    const knowledgeBases = await this.listSkillKnowledgeBasesUseCase.execute(
      new ListSkillKnowledgeBasesQuery(skillId),
    );

    const contexts = await Promise.all(
      knowledgeBases.map((knowledgeBase) =>
        this.knowledgeBaseAccessService.findOneAccessible(knowledgeBase.id),
      ),
    );
    return contexts.map(({ knowledgeBase, isActive, isShared }) =>
      this.knowledgeBaseDtoMapper.toDto(knowledgeBase, {
        isActive,
        isShared,
      }),
    );
  }
}
