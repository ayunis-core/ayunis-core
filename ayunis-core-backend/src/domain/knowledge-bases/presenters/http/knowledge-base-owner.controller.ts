import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { ChangeKnowledgeBaseOwnerCommand } from 'src/domain/knowledge-bases/application/use-cases/change-knowledge-base-owner/change-knowledge-base-owner.command';
import { ChangeKnowledgeBaseOwnerUseCase } from 'src/domain/knowledge-bases/application/use-cases/change-knowledge-base-owner/change-knowledge-base-owner.use-case';
import { FindKnowledgeBaseQuery } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base/find-knowledge-base.query';
import { FindKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base/find-knowledge-base.use-case';
import { PreviewKnowledgeBaseOwnerChangeUseCase } from 'src/domain/knowledge-bases/application/use-cases/preview-knowledge-base-owner-change/preview-knowledge-base-owner-change.use-case';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { KnowledgeBaseOwnerChangePreviewResponseDto } from './dto/knowledge-base-owner-change-preview-response.dto';
import {
  KnowledgeBaseTransferOwnerDto,
  toKnowledgeBaseTransferOwner,
} from './dto/knowledge-base-owner.dto';
import { KnowledgeBaseResponseDto } from './dto/knowledge-base-response.dto';
import { KnowledgeBaseDtoMapper } from './mappers/knowledge-base-dto.mapper';

@ApiTags('knowledge-bases')
@Controller('knowledge-bases')
export class KnowledgeBaseOwnerController {
  private readonly logger = new Logger(KnowledgeBaseOwnerController.name);

  constructor(
    private readonly changeOwnerUseCase: ChangeKnowledgeBaseOwnerUseCase,
    private readonly previewOwnerChangeUseCase: PreviewKnowledgeBaseOwnerChangeUseCase,
    private readonly findKnowledgeBaseUseCase: FindKnowledgeBaseUseCase,
    private readonly mapper: KnowledgeBaseDtoMapper,
  ) {}

  @RequirePermission(Permission.MANAGE_KNOWLEDGE_BASES)
  @Patch(':id/owner')
  @ApiOperation({
    summary: 'Move a knowledge base to the caller, a team or the organization',
  })
  @ApiBody({ type: KnowledgeBaseTransferOwnerDto })
  @ApiResponse({ status: 200, type: KnowledgeBaseResponseDto })
  async changeOwner(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: KnowledgeBaseTransferOwnerDto,
  ): Promise<KnowledgeBaseResponseDto> {
    this.logger.log({ id, ownerType: dto.ownerType }, 'changeOwner');
    await this.changeOwnerUseCase.execute(
      new ChangeKnowledgeBaseOwnerCommand(
        id,
        toKnowledgeBaseTransferOwner(dto),
      ),
    );
    const { knowledgeBase, ...context } =
      await this.findKnowledgeBaseUseCase.execute(
        new FindKnowledgeBaseQuery(id),
      );
    return this.mapper.toDto(knowledgeBase, context);
  }

  @RequirePermission(Permission.MANAGE_KNOWLEDGE_BASES)
  @Get(':id/owner-change-preview')
  @ApiOperation({
    summary: 'Preview what moving a knowledge base would remove',
  })
  @ApiResponse({
    status: 200,
    type: KnowledgeBaseOwnerChangePreviewResponseDto,
  })
  previewOwnerChange(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Query() dto: KnowledgeBaseTransferOwnerDto,
  ): Promise<KnowledgeBaseOwnerChangePreviewResponseDto> {
    return this.previewOwnerChangeUseCase.execute({
      knowledgeBaseId: id,
      owner: toKnowledgeBaseTransferOwner(dto),
    });
  }
}
