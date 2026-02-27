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

const UPLOADS_DIR = './uploads';
fs.mkdirSync(resolve(UPLOADS_DIR), { recursive: true });
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import {
  detectFileType,
  isDocumentFile,
  getCanonicalMimeType,
} from 'src/common/util/file-type';

import { CreateKnowledgeBaseUseCase } from '../../application/use-cases/create-knowledge-base/create-knowledge-base.use-case';
import { UpdateKnowledgeBaseUseCase } from '../../application/use-cases/update-knowledge-base/update-knowledge-base.use-case';
import { DeleteKnowledgeBaseUseCase } from '../../application/use-cases/delete-knowledge-base/delete-knowledge-base.use-case';
import { AddDocumentToKnowledgeBaseUseCase } from '../../application/use-cases/add-document-to-knowledge-base/add-document-to-knowledge-base.use-case';
import { AddUrlToKnowledgeBaseUseCase } from '../../application/use-cases/add-url-to-knowledge-base/add-url-to-knowledge-base.use-case';
import { RemoveDocumentFromKnowledgeBaseUseCase } from '../../application/use-cases/remove-document-from-knowledge-base/remove-document-from-knowledge-base.use-case';
import { ListKnowledgeBaseDocumentsUseCase } from '../../application/use-cases/list-knowledge-base-documents/list-knowledge-base-documents.use-case';
import { KnowledgeBaseAccessService } from '../../application/services/knowledge-base-access.service';

import { CreateKnowledgeBaseCommand } from '../../application/use-cases/create-knowledge-base/create-knowledge-base.command';
import { UpdateKnowledgeBaseCommand } from '../../application/use-cases/update-knowledge-base/update-knowledge-base.command';
import { DeleteKnowledgeBaseCommand } from '../../application/use-cases/delete-knowledge-base/delete-knowledge-base.command';
import { AddDocumentToKnowledgeBaseCommand } from '../../application/use-cases/add-document-to-knowledge-base/add-document-to-knowledge-base.command';
import { AddUrlToKnowledgeBaseCommand } from '../../application/use-cases/add-url-to-knowledge-base/add-url-to-knowledge-base.command';
import { RemoveDocumentFromKnowledgeBaseCommand } from '../../application/use-cases/remove-document-from-knowledge-base/remove-document-from-knowledge-base.command';
import { ListKnowledgeBaseDocumentsQuery } from '../../application/use-cases/list-knowledge-base-documents/list-knowledge-base-documents.query';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';
import { AddUrlToKnowledgeBaseDto } from './dto/add-url-to-knowledge-base.dto';
import {
  KnowledgeBaseResponseDto,
  KnowledgeBaseListResponseDto,
} from './dto/knowledge-base-response.dto';
import {
  KnowledgeBaseDocumentResponseDto,
  KnowledgeBaseDocumentListResponseDto,
} from './dto/knowledge-base-document-response.dto';
import { MissingFileError } from '../../application/knowledge-bases.errors';
import { KnowledgeBaseDtoMapper } from './mappers/knowledge-base-dto.mapper';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';

@ApiTags('knowledge-bases')
@RequireFeature(FeatureFlag.KnowledgeBases)
@Controller('knowledge-bases')
export class KnowledgeBasesController {
  private readonly logger = new Logger(KnowledgeBasesController.name);

  constructor(
    private readonly createKnowledgeBaseUseCase: CreateKnowledgeBaseUseCase,
    private readonly updateKnowledgeBaseUseCase: UpdateKnowledgeBaseUseCase,
    private readonly deleteKnowledgeBaseUseCase: DeleteKnowledgeBaseUseCase,
    private readonly addDocumentUseCase: AddDocumentToKnowledgeBaseUseCase,
    private readonly addUrlUseCase: AddUrlToKnowledgeBaseUseCase,
    private readonly removeDocumentUseCase: RemoveDocumentFromKnowledgeBaseUseCase,
    private readonly listDocumentsUseCase: ListKnowledgeBaseDocumentsUseCase,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
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

    const results = await this.knowledgeBaseAccessService.findAllAccessible();

    return {
      data: results.map((r) =>
        this.knowledgeBaseDtoMapper.toDto(r.knowledgeBase, r.isShared),
      ),
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
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<KnowledgeBaseResponseDto> {
    this.logger.log('findOne', { id });

    const { knowledgeBase, isShared } =
      await this.knowledgeBaseAccessService.findOneAccessible(id);

    return this.knowledgeBaseDtoMapper.toDto(knowledgeBase, isShared);
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload (PDF, DOCX, PPTX)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The document has been added to the knowledge base',
    type: KnowledgeBaseDocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Knowledge base not found' })
  /* eslint-disable sonarjs/content-length -- multer file size limit, not HTTP Content-Length */
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) => {
          const randomName = randomUUID();
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    }),
  )
  /* eslint-enable sonarjs/content-length */
  async addDocument(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
    @UploadedFile()
    file?: {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
      path: string;
    },
  ): Promise<KnowledgeBaseDocumentResponseDto> {
    if (!file) {
      throw new MissingFileError();
    }

    this.logger.log('addDocument', {
      knowledgeBaseId: id,
      fileName: file.originalname,
    });

    const detectedType = detectFileType(file.mimetype, file.originalname);
    if (!isDocumentFile(detectedType)) {
      await this.cleanupTempFile(file.path);
      throw new BadRequestException(
        `Unsupported file type: ${file.originalname}. Knowledge bases only support PDF, DOCX, and PPTX files.`,
      );
    }

    const canonicalMimeType = getCanonicalMimeType(detectedType);
    if (!canonicalMimeType) {
      await this.cleanupTempFile(file.path);
      throw new BadRequestException(
        `Unable to determine MIME type for detected file type: ${detectedType}`,
      );
    }

    try {
      const fileData = await fs.promises.readFile(file.path);

      const source = await this.addDocumentUseCase.execute(
        new AddDocumentToKnowledgeBaseCommand({
          knowledgeBaseId: id,
          userId,
          fileData,
          fileName: file.originalname,
          fileType: canonicalMimeType,
        }),
      );

      return this.knowledgeBaseDtoMapper.toDocumentDto(source);
    } finally {
      await this.cleanupTempFile(file.path);
    }
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
  @ApiResponse({
    status: 201,
    description: 'The URL source has been added to the knowledge base',
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
    });

    const source = await this.addUrlUseCase.execute(
      new AddUrlToKnowledgeBaseCommand({
        knowledgeBaseId: id,
        userId,
        url: dto.url,
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
