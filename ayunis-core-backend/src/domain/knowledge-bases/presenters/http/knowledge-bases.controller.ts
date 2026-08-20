import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiBodyOptions,
  ApiParamOptions,
} from '@nestjs/swagger';
import * as fs from 'fs';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import {
  cleanupTempUploadFile,
  createDocumentUploadInterceptor,
  resolveDocumentUploadMimeType,
  type UploadedDocument,
} from 'src/common/http/document-upload';

import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { CreateKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/create-knowledge-base/create-knowledge-base.use-case';
import { CreateKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/create-knowledge-base/create-knowledge-base.command';
import { UpdateKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/update-knowledge-base/update-knowledge-base.use-case';
import { UpdateKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/update-knowledge-base/update-knowledge-base.command';
import { DeleteKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/delete-knowledge-base/delete-knowledge-base.use-case';
import { DeleteKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/delete-knowledge-base/delete-knowledge-base.command';
import { AddDocumentToKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/add-document-to-knowledge-base/add-document-to-knowledge-base.use-case';
import { AddDocumentToKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/add-document-to-knowledge-base/add-document-to-knowledge-base.command';
import { AddUrlToKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/add-url-to-knowledge-base/add-url-to-knowledge-base.use-case';
import { AddUrlToKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/add-url-to-knowledge-base/add-url-to-knowledge-base.command';
import { RemoveDocumentFromKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/remove-document-from-knowledge-base/remove-document-from-knowledge-base.use-case';
import { RemoveDocumentFromKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/remove-document-from-knowledge-base/remove-document-from-knowledge-base.command';
import { ListKnowledgeBaseDocumentsUseCase } from 'src/domain/knowledge-bases/application/use-cases/list-knowledge-base-documents/list-knowledge-base-documents.use-case';
import { ListKnowledgeBaseDocumentsQuery } from 'src/domain/knowledge-bases/application/use-cases/list-knowledge-base-documents/list-knowledge-base-documents.query';
import { MissingFileError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';

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
import { KnowledgeBaseDtoMapper } from './mappers/knowledge-base-dto.mapper';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

const KB_ID_PARAM: ApiParamOptions = {
  name: 'id',
  description: 'The UUID of the knowledge base',
  type: 'string',
  format: 'uuid',
};

const DOCUMENT_UPLOAD_API_BODY: ApiBodyOptions = {
  schema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
        description: 'The file to upload (PDF, DOCX, PPTX, TXT, max 25 MB)',
      },
    },
    required: ['file'],
  },
};

const DocumentUploadInterceptor = createDocumentUploadInterceptor(
  KnowledgeBasesConstants.MAX_FILE_SIZE_BYTES,
);

@ApiTags('knowledge-bases')
@RequireFeature(FeatureFlag.KnowledgeBases)
@Controller('knowledge-bases')
export class KnowledgeBasesController {
  constructor(
    @InjectPinoLogger(KnowledgeBasesController.name)
    private readonly logger: PinoLogger,
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

  @RequirePermission(Permission.MANAGE_KNOWLEDGE_BASES)
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
    this.logger.info({ name: dto.name, userId }, 'create');
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
    this.logger.info({ userId }, 'findAll');
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
    this.logger.info({ id }, 'findOne');
    const { knowledgeBase, isShared } =
      await this.knowledgeBaseAccessService.findOneAccessible(id);
    return this.knowledgeBaseDtoMapper.toDto(knowledgeBase, isShared);
  }

  @RequirePermission(Permission.MANAGE_KNOWLEDGE_BASES)
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
    this.logger.info({ id, name: dto.name, userId }, 'update');
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

  @RequirePermission(Permission.MANAGE_KNOWLEDGE_BASES)
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
    this.logger.info({ id, userId }, 'delete');
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
    this.logger.info({ knowledgeBaseId: id, userId }, 'listDocuments');
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

  @RequirePermission(Permission.MANAGE_KNOWLEDGE_BASES)
  @Post(':id/documents')
  @ApiOperation({ summary: 'Add a document to a knowledge base' })
  @ApiParam(KB_ID_PARAM)
  @ApiConsumes('multipart/form-data')
  @ApiBody(DOCUMENT_UPLOAD_API_BODY)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiResponse({
    status: 202,
    description:
      'The document has been accepted and is being processed in the background',
    type: KnowledgeBaseDocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Knowledge base not found' })
  @ApiResponse({
    status: 413,
    description: 'File exceeds the 25 MB upload limit',
  })
  @UseInterceptors(DocumentUploadInterceptor)
  async addDocument(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('id', ParseUUIDPipe) id: UUID,
    @UploadedFile() file?: UploadedDocument,
  ): Promise<KnowledgeBaseDocumentResponseDto> {
    if (!file) {
      throw new MissingFileError();
    }

    this.logger.info(
      {
        knowledgeBaseId: id,
        fileName: file.originalname,
      },
      'addDocument',
    );
    try {
      const canonicalMimeType = this.resolveDocumentMimeType(file);
      return await this.processDocumentUpload(
        userId,
        id,
        file,
        canonicalMimeType,
      );
    } finally {
      await this.cleanupTempFile(file.path);
    }
  }

  private async processDocumentUpload(
    userId: UUID,
    knowledgeBaseId: UUID,
    file: UploadedDocument,
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

  private resolveDocumentMimeType(file: UploadedDocument): string {
    return resolveDocumentUploadMimeType({
      file,
      errorMessage: (reason, detectedType) =>
        reason === 'missing-mime'
          ? `Unable to determine MIME type for detected file type: ${detectedType}`
          : `Unsupported file type: ${file.originalname}. Knowledge bases only support PDF, DOCX, PPTX, TXT, EML, and audio files (MP3, M4A, WAV, WebM).`,
    });
  }

  @RequirePermission(Permission.MANAGE_KNOWLEDGE_BASES)
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
    this.logger.info(
      {
        knowledgeBaseId: id,
        url: dto.url,
        maxDepth: dto.maxDepth,
      },
      'addUrl',
    );
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

  @RequirePermission(Permission.MANAGE_KNOWLEDGE_BASES)
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
    this.logger.info(
      {
        knowledgeBaseId: id,
        documentId,
        userId,
      },
      'removeDocument',
    );
    await this.removeDocumentUseCase.execute(
      new RemoveDocumentFromKnowledgeBaseCommand({
        knowledgeBaseId: id,
        documentId,
        userId,
      }),
    );
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    await cleanupTempUploadFile(filePath, this.logger);
  }
}
