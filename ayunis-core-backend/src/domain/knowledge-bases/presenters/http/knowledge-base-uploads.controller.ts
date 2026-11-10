import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { CreateKnowledgeBaseUploadUseCase } from 'src/domain/knowledge-bases/application/use-cases/create-knowledge-base-upload/create-knowledge-base-upload.use-case';
import { CreateKnowledgeBaseUploadCommand } from 'src/domain/knowledge-bases/application/use-cases/create-knowledge-base-upload/create-knowledge-base-upload.command';
import { CompleteKnowledgeBaseUploadUseCase } from 'src/domain/knowledge-bases/application/use-cases/complete-knowledge-base-upload/complete-knowledge-base-upload.use-case';
import { CompleteKnowledgeBaseUploadCommand } from 'src/domain/knowledge-bases/application/use-cases/complete-knowledge-base-upload/complete-knowledge-base-upload.command';
import { CreateSourceUploadDto } from 'src/domain/sources/presenters/http/dto/create-source-upload.dto';
import { SourceUploadSessionResponseDto } from 'src/domain/sources/presenters/http/dto/source-upload-session-response.dto';
import { toSourceUploadSessionDto } from 'src/domain/sources/presenters/http/mappers/source-upload.mapper';
import { KnowledgeBaseDocumentResponseDto } from './dto/knowledge-base-document-response.dto';
import { KnowledgeBaseDtoMapper } from './mappers/knowledge-base-dto.mapper';

const KB_ID_PARAM = {
  name: 'id',
  description: 'The UUID of the knowledge base',
  type: 'string',
  format: 'uuid',
} as const;

/** Direct (browser → object storage) document uploads for a knowledge base. */
@ApiTags('knowledge-bases')
@Controller('knowledge-bases')
export class KnowledgeBaseUploadsController {
  private readonly logger = new Logger(KnowledgeBaseUploadsController.name);

  constructor(
    private readonly createUploadUseCase: CreateKnowledgeBaseUploadUseCase,
    private readonly completeUploadUseCase: CompleteKnowledgeBaseUploadUseCase,
    private readonly knowledgeBaseDtoMapper: KnowledgeBaseDtoMapper,
  ) {}

  @Post(':id/uploads')
  @ApiOperation({
    summary: 'Create a direct document upload for a knowledge base',
    description:
      'Checks access, limits and file type, then reserves an upload the browser transfers straight to object storage via the /source-uploads endpoints. Complete it with POST /knowledge-bases/{id}/uploads/{uploadId}/complete.',
  })
  @ApiParam(KB_ID_PARAM)
  @ApiResponse({ status: 201, type: SourceUploadSessionResponseDto })
  @ApiResponse({ status: 400, description: 'Unsupported file type' })
  @ApiResponse({ status: 404, description: 'Knowledge base not found' })
  @ApiResponse({ status: 413, description: 'File exceeds the upload limit' })
  @ApiResponse({
    status: 409,
    description: 'The target has no source capacity left',
  })
  async createUpload(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: CreateSourceUploadDto,
  ): Promise<SourceUploadSessionResponseDto> {
    this.logger.log(
      { knowledgeBaseId: id, fileName: dto.fileName },
      'createUpload',
    );
    return toSourceUploadSessionDto(
      await this.createUploadUseCase.execute(
        new CreateKnowledgeBaseUploadCommand({ knowledgeBaseId: id, ...dto }),
      ),
    );
  }

  @Post(':id/uploads/:uploadId/complete')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Complete a direct document upload',
    description:
      'Verifies the stored file, creates the processing document and queues it. Safe to repeat: a second call returns the same document.',
  })
  @ApiParam(KB_ID_PARAM)
  @ApiParam({
    name: 'uploadId',
    description: 'The upload id',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ status: 202, type: KnowledgeBaseDocumentResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Knowledge base or upload not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'The file was not fully transferred, or the target has no source capacity left',
  })
  @ApiResponse({ status: 410, description: 'The upload expired' })
  @ApiResponse({
    status: 400,
    description: 'The upload was reserved for another target',
  })
  async completeUpload(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('uploadId', ParseUUIDPipe) uploadId: UUID,
  ): Promise<KnowledgeBaseDocumentResponseDto> {
    this.logger.log({ knowledgeBaseId: id, uploadId }, 'completeUpload');
    const source = await this.completeUploadUseCase.execute(
      new CompleteKnowledgeBaseUploadCommand(id, uploadId),
    );
    return this.knowledgeBaseDtoMapper.toDocumentDto(source);
  }
}
