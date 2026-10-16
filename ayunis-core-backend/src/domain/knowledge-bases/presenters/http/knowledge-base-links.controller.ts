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
import type { OwnedKnowledgeBase } from 'src/domain/knowledge-bases/application/models/linked-knowledge-base';
import { LinkKnowledgeBasesToWorkspaceCommand } from 'src/domain/knowledge-bases/application/use-cases/link-knowledge-bases-to-workspace/link-knowledge-bases-to-workspace.command';
import { LinkKnowledgeBasesToWorkspaceUseCase } from 'src/domain/knowledge-bases/application/use-cases/link-knowledge-bases-to-workspace/link-knowledge-bases-to-workspace.use-case';
import { ListKnowledgeBaseLinkedWorkspacesQuery } from 'src/domain/knowledge-bases/application/use-cases/list-knowledge-base-linked-workspaces/list-knowledge-base-linked-workspaces.query';
import { ListKnowledgeBaseLinkedWorkspacesUseCase } from 'src/domain/knowledge-bases/application/use-cases/list-knowledge-base-linked-workspaces/list-knowledge-base-linked-workspaces.use-case';
import { ListLinkableWorkspaceKnowledgeBasesQuery } from 'src/domain/knowledge-bases/application/use-cases/list-linkable-workspace-knowledge-bases/list-linkable-workspace-knowledge-bases.query';
import { ListLinkableWorkspaceKnowledgeBasesUseCase } from 'src/domain/knowledge-bases/application/use-cases/list-linkable-workspace-knowledge-bases/list-linkable-workspace-knowledge-bases.use-case';
import { ListLinkedWorkspaceKnowledgeBasesQuery } from 'src/domain/knowledge-bases/application/use-cases/list-linked-workspace-knowledge-bases/list-linked-workspace-knowledge-bases.query';
import { ListLinkedWorkspaceKnowledgeBasesUseCase } from 'src/domain/knowledge-bases/application/use-cases/list-linked-workspace-knowledge-bases/list-linked-workspace-knowledge-bases.use-case';
import { UnlinkKnowledgeBaseFromWorkspaceCommand } from 'src/domain/knowledge-bases/application/use-cases/unlink-knowledge-base-from-workspace/unlink-knowledge-base-from-workspace.command';
import { UnlinkKnowledgeBaseFromWorkspaceUseCase } from 'src/domain/knowledge-bases/application/use-cases/unlink-knowledge-base-from-workspace/unlink-knowledge-base-from-workspace.use-case';
import { LinkedWorkspacesResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-link.dto';
import { toLinkedWorkspacesDto } from 'src/domain/workspaces/presenters/http/mappers/linked-workspaces-dto.mapper';
import {
  KnowledgeBaseLinkSearchQueryDto,
  LinkableKnowledgeBasesResponseDto,
  LinkedKnowledgeBaseListResponseDto,
  LinkKnowledgeBasesDto,
  type KnowledgeBaseLinkSummaryDto,
} from './dto/knowledge-base-link.dto';

@ApiTags('knowledge-base-links')
@Controller()
export class KnowledgeBaseLinksController {
  constructor(
    private readonly listLinked: ListLinkedWorkspaceKnowledgeBasesUseCase,
    private readonly listLinkable: ListLinkableWorkspaceKnowledgeBasesUseCase,
    private readonly linkKnowledgeBases: LinkKnowledgeBasesToWorkspaceUseCase,
    private readonly unlinkKnowledgeBase: UnlinkKnowledgeBaseFromWorkspaceUseCase,
    private readonly listLinkedWorkspaces: ListKnowledgeBaseLinkedWorkspacesUseCase,
  ) {}

  @Get('workspaces/:workspaceId/linked-knowledge-bases')
  @ApiOperation({ summary: 'List knowledge bases linked into a workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: LinkedKnowledgeBaseListResponseDto })
  async linked(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Query() query: KnowledgeBaseLinkSearchQueryDto,
  ): Promise<LinkedKnowledgeBaseListResponseDto> {
    const linked = await this.listLinked.execute(
      new ListLinkedWorkspaceKnowledgeBasesQuery(
        workspaceId,
        query.search?.trim(),
      ),
    );
    return {
      data: linked.map(({ linkedBy, linkedAt, ...owned }) => ({
        knowledgeBase: this.toSummary(owned),
        linkedBy,
        linkedAt,
      })),
    };
  }

  @Get('workspaces/:workspaceId/linkable-knowledge-bases')
  @ApiOperation({
    summary:
      'List knowledge bases the caller may link into a workspace, by owner',
  })
  @ApiParam({ name: 'workspaceId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: LinkableKnowledgeBasesResponseDto })
  async linkable(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Query() query: KnowledgeBaseLinkSearchQueryDto,
  ): Promise<LinkableKnowledgeBasesResponseDto> {
    const { own, team, org } = await this.listLinkable.execute(
      new ListLinkableWorkspaceKnowledgeBasesQuery(
        workspaceId,
        query.search?.trim(),
      ),
    );
    const toSummaries = (entries: OwnedKnowledgeBase[]) =>
      entries.map((entry) => this.toSummary(entry));
    return {
      own: toSummaries(own),
      team: toSummaries(team),
      org: toSummaries(org),
    };
  }

  @Post('workspaces/:workspaceId/linked-knowledge-bases')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Link knowledge bases into a workspace; already linked ones are kept',
  })
  @ApiParam({ name: 'workspaceId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204 })
  async link(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Body() dto: LinkKnowledgeBasesDto,
  ): Promise<void> {
    await this.linkKnowledgeBases.execute(
      new LinkKnowledgeBasesToWorkspaceCommand(
        workspaceId,
        dto.knowledgeBaseIds,
      ),
    );
  }

  @Delete('workspaces/:workspaceId/linked-knowledge-bases/:knowledgeBaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a knowledge base link from a workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'knowledgeBaseId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204 })
  async unlink(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: UUID,
  ): Promise<void> {
    await this.unlinkKnowledgeBase.execute(
      new UnlinkKnowledgeBaseFromWorkspaceCommand(workspaceId, knowledgeBaseId),
    );
  }

  @Get('knowledge-bases/:id/linked-workspaces')
  @ApiOperation({
    summary: 'List the workspaces a knowledge base is linked into',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: LinkedWorkspacesResponseDto })
  async linkedWorkspaces(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<LinkedWorkspacesResponseDto> {
    const linked = await this.listLinkedWorkspaces.execute(
      new ListKnowledgeBaseLinkedWorkspacesQuery(id),
    );
    return toLinkedWorkspacesDto(linked);
  }

  private toSummary({
    knowledgeBase,
    owner,
  }: OwnedKnowledgeBase): KnowledgeBaseLinkSummaryDto {
    return {
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      description: knowledgeBase.description,
      owner,
    };
  }
}
