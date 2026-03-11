import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Logger,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { UUID } from 'crypto';

import { CreateArtifactUseCase } from '../../application/use-cases/create-artifact/create-artifact.use-case';
import { UpdateArtifactUseCase } from '../../application/use-cases/update-artifact/update-artifact.use-case';
import { FindArtifactsByThreadUseCase } from '../../application/use-cases/find-artifacts-by-thread/find-artifacts-by-thread.use-case';
import { FindArtifactWithVersionsUseCase } from '../../application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { RevertArtifactUseCase } from '../../application/use-cases/revert-artifact/revert-artifact.use-case';
import { ExportArtifactUseCase } from '../../application/use-cases/export-artifact/export-artifact.use-case';

import { CreateArtifactCommand } from '../../application/use-cases/create-artifact/create-artifact.command';
import { UpdateArtifactCommand } from '../../application/use-cases/update-artifact/update-artifact.command';
import { FindArtifactsByThreadQuery } from '../../application/use-cases/find-artifacts-by-thread/find-artifacts-by-thread.query';
import { FindArtifactWithVersionsQuery } from '../../application/use-cases/find-artifact-with-versions/find-artifact-with-versions.query';
import { RevertArtifactCommand } from '../../application/use-cases/revert-artifact/revert-artifact.command';
import { ExportArtifactCommand } from '../../application/use-cases/export-artifact/export-artifact.command';

import { CreateArtifactDto } from './dtos/create-artifact.dto';
import { UpdateArtifactDto } from './dtos/update-artifact.dto';
import { RevertArtifactDto } from './dtos/revert-artifact.dto';
import { ExportArtifactQueryDto } from './dtos/export-artifact.dto';
import {
  ArtifactResponseDto,
  ArtifactVersionResponseDto,
} from './dtos/artifact-response.dto';
import { ArtifactDtoMapper } from './mappers/artifact-dto.mapper';

@ApiTags('artifacts')
@Controller('artifacts')
export class ArtifactsController {
  private readonly logger = new Logger(ArtifactsController.name);

  constructor(
    private readonly createArtifactUseCase: CreateArtifactUseCase,
    private readonly updateArtifactUseCase: UpdateArtifactUseCase,
    private readonly findArtifactsByThreadUseCase: FindArtifactsByThreadUseCase,
    private readonly findArtifactWithVersionsUseCase: FindArtifactWithVersionsUseCase,
    private readonly revertArtifactUseCase: RevertArtifactUseCase,
    private readonly exportArtifactUseCase: ExportArtifactUseCase,
    private readonly artifactDtoMapper: ArtifactDtoMapper,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new artifact (document)' })
  @ApiResponse({
    status: 201,
    description: 'The artifact has been created',
    type: ArtifactResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() dto: CreateArtifactDto): Promise<ArtifactResponseDto> {
    this.logger.log('create', { title: dto.title, threadId: dto.threadId });
    const artifact = await this.createArtifactUseCase.execute(
      new CreateArtifactCommand({
        threadId: dto.threadId,
        title: dto.title,
        content: dto.content,
        authorType: dto.authorType,
      }),
    );
    return this.artifactDtoMapper.toDto(artifact);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an artifact (add a new version)' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the artifact',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'The new version has been created',
    type: ArtifactVersionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Artifact not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateArtifactDto,
  ): Promise<ArtifactVersionResponseDto> {
    this.logger.log('update', { artifactId: id });
    const version = await this.updateArtifactUseCase.execute(
      new UpdateArtifactCommand({
        artifactId: id,
        content: dto.content,
        authorType: dto.authorType,
      }),
    );
    return this.artifactDtoMapper.toVersionDto(version);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an artifact by ID with all versions' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the artifact',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'The artifact with all versions',
    type: ArtifactResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Artifact not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<ArtifactResponseDto> {
    this.logger.log('findOne', { id });
    const artifact = await this.findArtifactWithVersionsUseCase.execute(
      new FindArtifactWithVersionsQuery({ artifactId: id }),
    );
    return this.artifactDtoMapper.toDto(artifact);
  }

  @Get('thread/:threadId')
  @ApiOperation({ summary: 'Get all artifacts for a thread' })
  @ApiParam({
    name: 'threadId',
    description: 'The UUID of the thread',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'List of artifacts for the thread',
    type: [ArtifactResponseDto],
  })
  async findByThread(
    @Param('threadId', ParseUUIDPipe) threadId: UUID,
  ): Promise<ArtifactResponseDto[]> {
    this.logger.log('findByThread', { threadId });
    const artifacts = await this.findArtifactsByThreadUseCase.execute(
      new FindArtifactsByThreadQuery({ threadId }),
    );
    return artifacts.map((a) => this.artifactDtoMapper.toDto(a));
  }

  @Post(':id/revert')
  @ApiOperation({ summary: 'Revert an artifact to a specific version' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the artifact',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'A new version was created with the reverted content',
    type: ArtifactVersionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Artifact or version not found' })
  async revert(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: RevertArtifactDto,
  ): Promise<ArtifactVersionResponseDto> {
    this.logger.log('revert', {
      artifactId: id,
      versionNumber: dto.versionNumber,
    });
    const version = await this.revertArtifactUseCase.execute(
      new RevertArtifactCommand({
        artifactId: id,
        versionNumber: dto.versionNumber,
      }),
    );
    return this.artifactDtoMapper.toVersionDto(version);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export an artifact as DOCX or PDF' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the artifact',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'format',
    description: 'Export format',
    enum: ['docx', 'pdf'],
  })
  @ApiResponse({
    status: 200,
    description: 'The exported file',
    content: {
      'application/octet-stream': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Artifact not found' })
  async export(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Query() query: ExportArtifactQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log('export', { artifactId: id, format: query.format });
    const result = await this.exportArtifactUseCase.execute(
      new ExportArtifactCommand({ artifactId: id, format: query.format }),
    );

    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
    });

    return new StreamableFile(result.buffer);
  }
}
