import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  Logger,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import {
  detectFileType,
  isAudioFile,
  isDocumentFile,
  isPlainTextFile,
  getCanonicalMimeType,
} from 'src/common/util/file-type';
import { AddDocumentToKnowledgeBaseUseCase } from '../../application/use-cases/add-document-to-knowledge-base/add-document-to-knowledge-base.use-case';
import { AddUrlToKnowledgeBaseUseCase } from '../../application/use-cases/add-url-to-knowledge-base/add-url-to-knowledge-base.use-case';
import { RemoveDocumentFromKnowledgeBaseUseCase } from '../../application/use-cases/remove-document-from-knowledge-base/remove-document-from-knowledge-base.use-case';
import { ListKnowledgeBaseDocumentsUseCase } from '../../application/use-cases/list-knowledge-base-documents/list-knowledge-base-documents.use-case';
import { KnowledgeBaseAccessService } from '../../application/services/knowledge-base-access.service';
import { AddDocumentToKnowledgeBaseCommand } from '../../application/use-cases/add-document-to-knowledge-base/add-document-to-knowledge-base.command';
import { AddUrlToKnowledgeBaseCommand } from '../../application/use-cases/add-url-to-knowledge-base/add-url-to-knowledge-base.command';
import { RemoveDocumentFromKnowledgeBaseCommand } from '../../application/use-cases/remove-document-from-knowledge-base/remove-document-from-knowledge-base.command';
import { ListKnowledgeBaseDocumentsQuery } from '../../application/use-cases/list-knowledge-base-documents/list-knowledge-base-documents.query';
import { AddUrlToKnowledgeBaseDto } from './dto/add-url-to-knowledge-base.dto';
import {
  KnowledgeBaseDocumentResponseDto,
  KnowledgeBaseDocumentListResponseDto,
} from './dto/knowledge-base-document-response.dto';
import { MissingFileError } from '../../application/knowledge-bases.errors';
import { KnowledgeBasesConstants } from '../../domain/knowledge-bases.constants';
import { KnowledgeBaseDtoMapper } from './mappers/knowledge-base-dto.mapper';
import { TusUploadService } from 'src/domain/uploads/application/services/tus-upload.service';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';

const UPLOADS_DIR = './uploads';
fs.mkdirSync(resolve(UPLOADS_DIR), { recursive: true });

interface UploadedKbDocument {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  path: string;
}

const KB_DOCUMENT_ACCEPTED_RESPONSE = {
  status: 202,
  description:
    'The document has been accepted and is being processed in the background',
  type: KnowledgeBaseDocumentResponseDto,
};

const KB_DOCUMENT_API_BODY = {
  schema: {
    type: 'object' as const,
    properties: {
      file: {
        type: 'string',
        format: 'binary',
        description: 'The file to upload (PDF, DOCX, PPTX, TXT, max 50 MB)',
      },
    },
    required: ['file'],
  },
};

/* eslint-disable sonarjs/content-length -- multer file size limit, not HTTP Content-Length */
const KB_DOCUMENT_UPLOAD_OPTIONS = {
  storage: diskStorage({
    destination: UPLOADS_DIR,
    filename: (
      _req: unknown,
      file: { originalname: string },
      cb: (error: Error | null, filename: string) => void,
    ) => {
      cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: KnowledgeBasesConstants.MAX_FILE_SIZE_BYTES },
};
/* eslint-enable sonarjs/content-length */

@ApiTags('knowledge-bases')
@RequireFeature(FeatureFlag.KnowledgeBases)
@Controller('knowledge-bases')
export class KnowledgeBaseDocumentsController {
  private readonly logger = new Logger(KnowledgeBaseDocumentsController.name);

  constructor(
    private readonly addDocumentUseCase: AddDocumentToKnowledgeBaseUseCase,
    private readonly addUrlUseCase: AddUrlToKnowledgeBaseUseCase,
    private readonly removeDocumentUseCase: RemoveDocumentFromKnowledgeBaseUseCase,
    private readonly listDocumentsUseCase: ListKnowledgeBaseDocumentsUseCase,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
    private readonly knowledgeBaseDtoMapper: KnowledgeBaseDtoMapper,
    private readonly tusUploadService: TusUploadService,
  ) {}

  @Get(':id/documents')
  @ApiOperation({
    summary: 'List all documents in a knowledge base',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the knowledge base',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the documents in the knowledge base',
    type: KnowledgeBaseDocumentListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Knowledge base not found' })
  async listDocuments(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<KnowledgeBaseDocumentListResponseDto> {
    this.logger.log('listDocuments', { knowledgeBaseId: id, userId });

    await this.knowledgeBaseAccessService.findAccessibleKnowledgeBase(id);

    const sources = await this.listDocumentsUseCase.execute(
      new ListKnowledgeBaseDocumentsQuery(id),
    );

    return {
      data: sources.map((source) =>
        this.knowledgeBaseDtoMapper.toDocumentDto(source),
      ),
    };
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Add a document to a knowledge base' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the knowledge base',
    type: 'string',
    format: 'uuid',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody(KB_DOCUMENT_API_BODY)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiResponse(KB_DOCUMENT_ACCEPTED_RESPONSE)
  @ApiResponse({ status: 404, description: 'Knowledge base not found' })
  @ApiResponse({
    status: 413,
    description: 'File exceeds the 50 MB upload limit',
  })
  @UseInterceptors(FileInterceptor('file', KB_DOCUMENT_UPLOAD_OPTIONS))
  async addDocument(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
    @UploadedFile() file?: UploadedKbDocument,
  ): Promise<KnowledgeBaseDocumentResponseDto> {
    if (!file) {
      throw new MissingFileError();
    }

    this.logger.log('addDocument', {
      knowledgeBaseId: id,
      fileName: file.originalname,
    });

    const canonicalMimeType = await this.resolveDocumentMimeType(file);

    try {
      return await this.processDocument(id, userId, file, canonicalMimeType);
    } finally {
      await this.cleanupTempFile(file.path);
    }
  }

  @Post(':id/documents/uploads/:uploadId')
  @ApiOperation({
    summary: 'Attach a completed resumable (tus) upload as a document',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the knowledge base',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({ name: 'uploadId', description: 'The tus upload id' })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiResponse(KB_DOCUMENT_ACCEPTED_RESPONSE)
  @ApiResponse({
    status: 404,
    description: 'Knowledge base or upload not found',
  })
  @ApiResponse({ status: 409, description: 'Upload not finished yet' })
  async finalizeDocumentUpload(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('uploadId') uploadId: string,
  ): Promise<KnowledgeBaseDocumentResponseDto> {
    this.logger.log('finalizeDocumentUpload', {
      knowledgeBaseId: id,
      uploadId,
    });
    const file = await this.tusUploadService.resolveCompletedUpload(
      uploadId,
      userId,
    );
    try {
      const canonicalMimeType = await this.resolveDocumentMimeType(file);
      return await this.processDocument(id, userId, file, canonicalMimeType);
    } finally {
      this.tusUploadService.cleanupUpload(uploadId);
    }
  }

  private async processDocument(
    knowledgeBaseId: UUID,
    userId: UUID,
    file: { originalname: string; path: string },
    fileType: string,
  ): Promise<KnowledgeBaseDocumentResponseDto> {
    const fileData = await fs.promises.readFile(file.path);
    const source = await this.addDocumentUseCase.execute(
      new AddDocumentToKnowledgeBaseCommand({
        knowledgeBaseId,
        userId,
        fileData,
        fileName: file.originalname,
        fileType,
      }),
    );
    return this.knowledgeBaseDtoMapper.toDocumentDto(source);
  }

  /** Validates the upload is a supported document type; cleans up on rejection. */
  private async resolveDocumentMimeType(file: {
    originalname: string;
    mimetype: string;
    path: string;
  }): Promise<string> {
    const detectedType = detectFileType(file.mimetype, file.originalname);
    if (
      !isDocumentFile(detectedType) &&
      !isPlainTextFile(detectedType) &&
      !isAudioFile(detectedType)
    ) {
      await this.cleanupTempFile(file.path);
      throw new BadRequestException(
        `Unsupported file type: ${file.originalname}. Knowledge bases only support PDF, DOCX, PPTX, TXT, and audio files (MP3, M4A, WAV, WebM).`,
      );
    }

    const canonicalMimeType = getCanonicalMimeType(detectedType);
    if (!canonicalMimeType) {
      await this.cleanupTempFile(file.path);
      throw new BadRequestException(
        `Unable to determine MIME type for detected file type: ${detectedType}`,
      );
    }
    return canonicalMimeType;
  }

  @Post(':id/urls')
  @ApiOperation({ summary: 'Add a URL source to a knowledge base' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the knowledge base',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: AddUrlToKnowledgeBaseDto })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiResponse({
    status: 202,
    description:
      'The URL source has been accepted and is being processed in the background',
    type: KnowledgeBaseDocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Knowledge base not found' })
  async addUrl(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: AddUrlToKnowledgeBaseDto,
  ): Promise<KnowledgeBaseDocumentResponseDto> {
    this.logger.log('addUrl', {
      knowledgeBaseId: id,
      url: dto.url,
      maxDepth: dto.maxDepth,
    });

    const source = await this.addUrlUseCase.execute(
      new AddUrlToKnowledgeBaseCommand({
        knowledgeBaseId: id,
        userId,
        url: dto.url,
        maxDepth: dto.maxDepth,
      }),
    );

    return this.knowledgeBaseDtoMapper.toDocumentDto(source);
  }

  @Delete(':id/documents/:documentId')
  @ApiOperation({ summary: 'Remove a document from a knowledge base' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the knowledge base',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'documentId',
    description: 'The UUID of the document to remove',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'The document has been removed from the knowledge base',
  })
  @ApiResponse({
    status: 404,
    description: 'Knowledge base or document not found',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDocument(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('documentId', ParseUUIDPipe) documentId: UUID,
  ): Promise<void> {
    this.logger.log('removeDocument', {
      knowledgeBaseId: id,
      documentId,
      userId,
    });

    await this.removeDocumentUseCase.execute(
      new RemoveDocumentFromKnowledgeBaseCommand({
        knowledgeBaseId: id,
        documentId,
        userId,
      }),
    );
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      this.logger.warn('Failed to clean up temp file', {
        filePath,
        error: error as Error,
      });
    }
  }
}
