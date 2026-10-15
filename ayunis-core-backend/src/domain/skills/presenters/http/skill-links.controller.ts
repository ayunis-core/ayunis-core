import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UUID } from 'crypto';
import type { OwnedSkill } from 'src/domain/skills/application/models/linked-skill';
import { LinkSkillsToWorkspaceCommand } from 'src/domain/skills/application/use-cases/link-skills-to-workspace/link-skills-to-workspace.command';
import { LinkSkillsToWorkspaceUseCase } from 'src/domain/skills/application/use-cases/link-skills-to-workspace/link-skills-to-workspace.use-case';
import { ListLinkableWorkspaceSkillsQuery } from 'src/domain/skills/application/use-cases/list-linkable-workspace-skills/list-linkable-workspace-skills.query';
import { ListLinkableWorkspaceSkillsUseCase } from 'src/domain/skills/application/use-cases/list-linkable-workspace-skills/list-linkable-workspace-skills.use-case';
import { ListLinkedWorkspaceSkillsQuery } from 'src/domain/skills/application/use-cases/list-linked-workspace-skills/list-linked-workspace-skills.query';
import { ListLinkedWorkspaceSkillsUseCase } from 'src/domain/skills/application/use-cases/list-linked-workspace-skills/list-linked-workspace-skills.use-case';
import { ListSkillLinkedWorkspacesQuery } from 'src/domain/skills/application/use-cases/list-skill-linked-workspaces/list-skill-linked-workspaces.query';
import { ListSkillLinkedWorkspacesUseCase } from 'src/domain/skills/application/use-cases/list-skill-linked-workspaces/list-skill-linked-workspaces.use-case';
import { UnlinkSkillFromWorkspaceCommand } from 'src/domain/skills/application/use-cases/unlink-skill-from-workspace/unlink-skill-from-workspace.command';
import { UnlinkSkillFromWorkspaceUseCase } from 'src/domain/skills/application/use-cases/unlink-skill-from-workspace/unlink-skill-from-workspace.use-case';
import { LinkedWorkspacesResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-link.dto';
import { toLinkedWorkspacesDto } from 'src/domain/workspaces/presenters/http/mappers/linked-workspaces-dto.mapper';
import {
  LinkableSkillsResponseDto,
  LinkedSkillListResponseDto,
  LinkSkillsDto,
  SkillLinkSearchQueryDto,
  type SkillLinkSummaryDto,
} from './dto/skill-link.dto';

@ApiTags('skill-links')
@Controller()
export class SkillLinksController {
  constructor(
    private readonly listLinked: ListLinkedWorkspaceSkillsUseCase,
    private readonly listLinkable: ListLinkableWorkspaceSkillsUseCase,
    private readonly linkSkills: LinkSkillsToWorkspaceUseCase,
    private readonly unlinkSkill: UnlinkSkillFromWorkspaceUseCase,
    private readonly listLinkedWorkspaces: ListSkillLinkedWorkspacesUseCase,
  ) {}

  @Get('workspaces/:workspaceId/linked-skills')
  @ApiOperation({ summary: 'List skills linked into a workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: LinkedSkillListResponseDto })
  async linked(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Query() query: SkillLinkSearchQueryDto,
  ): Promise<LinkedSkillListResponseDto> {
    const linked = await this.listLinked.execute(
      new ListLinkedWorkspaceSkillsQuery(workspaceId, query.search?.trim()),
    );
    return {
      data: linked.map(({ linkedBy, linkedAt, ...owned }) => ({
        skill: this.toSummary(owned),
        linkedBy,
        linkedAt,
      })),
    };
  }

  @Get('workspaces/:workspaceId/linkable-skills')
  @ApiOperation({
    summary: 'List skills the caller may link into a workspace, by owner',
  })
  @ApiParam({ name: 'workspaceId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: LinkableSkillsResponseDto })
  async linkable(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Query() query: SkillLinkSearchQueryDto,
  ): Promise<LinkableSkillsResponseDto> {
    const linkable = await this.listLinkable.execute(
      new ListLinkableWorkspaceSkillsQuery(workspaceId, query.search?.trim()),
    );
    return {
      own: linkable.own.map((owned) => this.toSummary(owned)),
      team: linkable.team.map((owned) => this.toSummary(owned)),
      org: linkable.org.map((owned) => this.toSummary(owned)),
    };
  }

  @Post('workspaces/:workspaceId/linked-skills')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Link skills into a workspace; already linked ones are kept',
  })
  @ApiParam({ name: 'workspaceId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204 })
  async link(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Body() dto: LinkSkillsDto,
  ): Promise<void> {
    await this.linkSkills.execute(
      new LinkSkillsToWorkspaceCommand(workspaceId, dto.skillIds),
    );
  }

  @Delete('workspaces/:workspaceId/linked-skills/:skillId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a skill link from a workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'skillId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204 })
  async unlink(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
  ): Promise<void> {
    await this.unlinkSkill.execute(
      new UnlinkSkillFromWorkspaceCommand(workspaceId, skillId),
    );
  }

  @Get('skills/:id/linked-workspaces')
  @ApiOperation({ summary: 'List the workspaces a skill is linked into' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: LinkedWorkspacesResponseDto })
  async linkedWorkspaces(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<LinkedWorkspacesResponseDto> {
    return toLinkedWorkspacesDto(
      await this.listLinkedWorkspaces.execute(
        new ListSkillLinkedWorkspacesQuery(id),
      ),
    );
  }

  private toSummary({ skill, owner }: OwnedSkill): SkillLinkSummaryDto {
    return {
      id: skill.id,
      name: skill.name,
      shortDescription: skill.shortDescription,
      owner,
    };
  }
}
