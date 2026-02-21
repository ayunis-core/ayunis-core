import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';

import { CreateKnowledgeBaseUseCase } from '../../application/use-cases/create-knowledge-base/create-knowledge-base.use-case';
import { UpdateKnowledgeBaseUseCase } from '../../application/use-cases/update-knowledge-base/update-knowledge-base.use-case';
import { DeleteKnowledgeBaseUseCase } from '../../application/use-cases/delete-knowledge-base/delete-knowledge-base.use-case';
import { FindKnowledgeBaseUseCase } from '../../application/use-cases/find-knowledge-base/find-knowledge-base.use-case';
import { ListKnowledgeBasesUseCase } from '../../application/use-cases/list-knowledge-bases/list-knowledge-bases.use-case';

import { CreateKnowledgeBaseCommand } from '../../application/use-cases/create-knowledge-base/create-knowledge-base.command';
import { UpdateKnowledgeBaseCommand } from '../../application/use-cases/update-knowledge-base/update-knowledge-base.command';
import { DeleteKnowledgeBaseCommand } from '../../application/use-cases/delete-knowledge-base/delete-knowledge-base.command';
import { FindKnowledgeBaseQuery } from '../../application/use-cases/find-knowledge-base/find-knowledge-base.query';
import { ListKnowledgeBasesQuery } from '../../application/use-cases/list-knowledge-bases/list-knowledge-bases.query';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';
import {
  KnowledgeBaseResponseDto,
  KnowledgeBaseListResponseDto,
} from './dto/knowledge-base-response.dto';
import { KnowledgeBaseDtoMapper } from './mappers/knowledge-base-dto.mapper';

@ApiTags('knowledge-bases')
@Controller('knowledge-bases')
export class KnowledgeBasesController {
  private readonly logger = new Logger(KnowledgeBasesController.name);

  constructor(
    private readonly createKnowledgeBaseUseCase: CreateKnowledgeBaseUseCase,
    private readonly updateKnowledgeBaseUseCase: UpdateKnowledgeBaseUseCase,
    private readonly deleteKnowledgeBaseUseCase: DeleteKnowledgeBaseUseCase,
    private readonly findKnowledgeBaseUseCase: FindKnowledgeBaseUseCase,
    private readonly listKnowledgeBasesUseCase: ListKnowledgeBasesUseCase,
    private readonly knowledgeBaseDtoMapper: KnowledgeBaseDtoMapper,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new knowledge base' })
  @ApiBody({ type: CreateKnowledgeBaseDto })
  @ApiResponse({
    status: 201,
    description: 'The knowledge base has been successfully created',
    type: KnowledgeBaseResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() dto: CreateKnowledgeBaseDto,
  ): Promise<KnowledgeBaseResponseDto> {
    this.logger.log('create', { name: dto.name, userId });

    const knowledgeBase = await this.createKnowledgeBaseUseCase.execute(
      new CreateKnowledgeBaseCommand({
        name: dto.name,
        description: dto.description,
        userId,
        orgId,
      }),
    );

    return this.knowledgeBaseDtoMapper.toDto(knowledgeBase);
  }

  @Get()
  @ApiOperation({
    summary: 'List all knowledge bases for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all knowledge bases for the current user',
    type: KnowledgeBaseListResponseDto,
  })
  async findAll(
    @CurrentUser(UserProperty.ID) userId: UUID,
  ): Promise<KnowledgeBaseListResponseDto> {
    this.logger.log('findAll', { userId });

    const knowledgeBases = await this.listKnowledgeBasesUseCase.execute(
      new ListKnowledgeBasesQuery(userId),
    );

    return {
      data: this.knowledgeBaseDtoMapper.toDtoArray(knowledgeBases),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a knowledge base by ID' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the knowledge base',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the knowledge base',
    type: KnowledgeBaseResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Knowledge base not found' })
  async findOne(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<KnowledgeBaseResponseDto> {
    this.logger.log('findOne', { id, userId });

    const knowledgeBase = await this.findKnowledgeBaseUseCase.execute(
      new FindKnowledgeBaseQuery(id, userId),
    );

    return this.knowledgeBaseDtoMapper.toDto(knowledgeBase);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a knowledge base' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the knowledge base to update',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateKnowledgeBaseDto })
  @ApiResponse({
    status: 200,
    description: 'The knowledge base has been successfully updated',
    type: KnowledgeBaseResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Knowledge base not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async update(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateKnowledgeBaseDto,
  ): Promise<KnowledgeBaseResponseDto> {
    this.logger.log('update', { id, name: dto.name, userId });

    const knowledgeBase = await this.updateKnowledgeBaseUseCase.execute(
      new UpdateKnowledgeBaseCommand({
        knowledgeBaseId: id,
        userId,
        name: dto.name,
        description: dto.description,
      }),
    );

    return this.knowledgeBaseDtoMapper.toDto(knowledgeBase);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a knowledge base' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the knowledge base to delete',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'The knowledge base has been successfully deleted',
  })
  @ApiResponse({ status: 404, description: 'Knowledge base not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<void> {
    this.logger.log('delete', { id, userId });

    await this.deleteKnowledgeBaseUseCase.execute(
      new DeleteKnowledgeBaseCommand({ knowledgeBaseId: id, userId }),
    );
  }
}
