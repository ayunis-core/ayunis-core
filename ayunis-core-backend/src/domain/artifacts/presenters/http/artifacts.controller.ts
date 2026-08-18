import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Res,
  StreamableFile,
  HttpStatus,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';

import { CreateArtifactUseCase } from '../../application/use-cases/create-artifact/create-artifact.use-case';
import { UpdateArtifactUseCase } from '../../application/use-cases/update-artifact/update-artifact.use-case';
import { FindArtifactsByThreadUseCase } from '../../application/use-cases/find-artifacts-by-thread/find-artifacts-by-thread.use-case';
import { FindArtifactsByWorkspaceUseCase } from '../../application/use-cases/find-artifacts-by-workspace/find-artifacts-by-workspace.use-case';
import { FindArtifactWithVersionsUseCase } from '../../application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { RevertArtifactUseCase } from '../../application/use-cases/revert-artifact/revert-artifact.use-case';
import { ExportArtifactUseCase } from '../../application/use-cases/export-artifact/export-artifact.use-case';
import { SendEmailArtifactUseCase } from '../../application/use-cases/send-email-artifact/send-email-artifact.use-case';

import { CreateArtifactCommand } from '../../application/use-cases/create-artifact/create-artifact.command';
import { UpdateArtifactCommand } from '../../application/use-cases/update-artifact/update-artifact.command';
import { FindArtifactsByThreadQuery } from '../../application/use-cases/find-artifacts-by-thread/find-artifacts-by-thread.query';
import { FindArtifactsByWorkspaceQuery } from '../../application/use-cases/find-artifacts-by-workspace/find-artifacts-by-workspace.query';
import { FindArtifactWithVersionsQuery } from '../../application/use-cases/find-artifact-with-versions/find-artifact-with-versions.query';
import { RevertArtifactCommand } from '../../application/use-cases/revert-artifact/revert-artifact.command';
import { ExportArtifactCommand } from '../../application/use-cases/export-artifact/export-artifact.command';
import { SendEmailArtifactCommand } from '../../application/use-cases/send-email-artifact/send-email-artifact.command';

import { CreateArtifactDto } from './dtos/create-artifact.dto';
import { UpdateArtifactDto } from './dtos/update-artifact.dto';
import { RevertArtifactDto } from './dtos/revert-artifact.dto';
import { ExportArtifactQueryDto } from './dtos/export-artifact.dto';
import {
  ArtifactResponseDto,
  ArtifactVersionResponseDto,
} from './dtos/artifact-response.dto';
import { ArtifactDtoMapper } from './mappers/artifact-dto.mapper';
import { EmailDeliveryResponseDto } from './dtos/email-delivery-response.dto';

@ApiTags('artifacts')
@Controller('artifacts')
export class ArtifactsController {
  constructor(
    @InjectPinoLogger(ArtifactsController.name)
    private readonly logger: PinoLogger,
    private readonly createArtifactUseCase: CreateArtifactUseCase,
    private readonly updateArtifactUseCase: UpdateArtifactUseCase,
    private readonly findArtifactsByThreadUseCase: FindArtifactsByThreadUseCase,
    private readonly findArtifactsByWorkspaceUseCase: FindArtifactsByWorkspaceUseCase,
    private readonly findArtifactWithVersionsUseCase: FindArtifactWithVersionsUseCase,
    private readonly revertArtifactUseCase: RevertArtifactUseCase,
    private readonly exportArtifactUseCase: ExportArtifactUseCase,
    private readonly sendEmailArtifactUseCase: SendEmailArtifactUseCase,
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
    this.logger.info({ threadId: dto.threadId }, 'create');
    const artifact = await this.createArtifactUseCase.execute(
      new CreateArtifactCommand({
        threadId: dto.threadId,
        title: dto.title,
        content: dto.content,
        authorType: dto.authorType,
        letterheadId: dto.letterheadId,
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
  @ApiResponse({
    status: 204,
    description: 'Letterhead updated (no content change)',
  })
  @ApiResponse({ status: 404, description: 'Artifact not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateArtifactDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ArtifactVersionResponseDto | void> {
    this.logger.info({ artifactId: id }, 'update');
    const result = await this.updateArtifactUseCase.execute(
      new UpdateArtifactCommand({
        artifactId: id,
        content: dto.content,
        authorType: dto.authorType,
        letterheadId: dto.letterheadId,
      }),
    );
    if (result) {
      return this.artifactDtoMapper.toVersionDto(result);
    }
    res.status(HttpStatus.NO_CONTENT);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send the current version of an email artifact' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the email artifact',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'The email was sent or was already sent for this version',
    type: EmailDeliveryResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Delivery is already in progress' })
  async send(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<EmailDeliveryResponseDto> {
    this.logger.info({ artifactId: id }, 'send email artifact');
    const delivery = await this.sendEmailArtifactUseCase.execute(
      new SendEmailArtifactCommand({ artifactId: id }),
    );
    return {
      id: delivery.id,
      artifactId: delivery.artifactId,
      versionNumber: delivery.versionNumber,
      status: delivery.status,
      sentAt: delivery.sentAt?.toISOString() ?? null,
      createdAt: delivery.createdAt.toISOString(),
    };
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
    this.logger.info({ id }, 'findOne');
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
    this.logger.info({ threadId }, 'findByThread');
    const artifacts = await this.findArtifactsByThreadUseCase.execute(
      new FindArtifactsByThreadQuery({ threadId }),
    );
    return artifacts.map((a) => this.artifactDtoMapper.toDto(a));
  }

  @Get('workspace/:workspaceId')
  @RequireFeature(FeatureFlag.Workspaces)
  @ApiOperation({ summary: 'Get all artifacts in a workspace' })
  @ApiParam({
    name: 'workspaceId',
    description: 'The UUID of the workspace',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'List of artifacts from chats in the workspace',
    type: [ArtifactResponseDto],
  })
  async findByWorkspace(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
  ): Promise<ArtifactResponseDto[]> {
    this.logger.info({ workspaceId }, 'findByWorkspace');
    const artifacts = await this.findArtifactsByWorkspaceUseCase.execute(
      new FindArtifactsByWorkspaceQuery({ workspaceId }),
    );
    return artifacts.map((artifact) => this.artifactDtoMapper.toDto(artifact));
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
    this.logger.info(
      {
        artifactId: id,
        versionNumber: dto.versionNumber,
      },
      'revert',
    );
    const version = await this.revertArtifactUseCase.execute(
      new RevertArtifactCommand({
        artifactId: id,
        versionNumber: dto.versionNumber,
      }),
    );
    return this.artifactDtoMapper.toVersionDto(version);
  }

  @Get(':id/export')
  @ApiOperation({
    summary: 'Export an artifact as DOCX, PDF, XLSX, or CSV',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the artifact',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'format',
    description: 'Export format',
    enum: ['docx', 'pdf', 'xlsx', 'csv'],
  })
  @ApiQuery({ name: 'versionNumber', required: false, type: Number })
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
    this.logger.info({ artifactId: id, format: query.format }, 'export');
    const result = await this.exportArtifactUseCase.execute(
      new ExportArtifactCommand({
        artifactId: id,
        format: query.format,
        versionNumber: query.versionNumber,
      }),
    );
    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
    });

    return new StreamableFile(result.buffer);
  }
}
