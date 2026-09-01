import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import * as fs from 'fs';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import {
  cleanupTempUploadFile,
  createDocumentUploadInterceptor,
  resolveDocumentUploadMimeType,
  type UploadedDocument,
} from 'src/common/http/document-upload';
import { MissingWorkspaceDocumentFileError } from 'src/domain/workspaces/application/workspaces.errors';
import { BuildWorkspaceRunContextUseCase } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.use-case';
import { BuildWorkspaceRunContextQuery } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.query';
import { AddDocumentToWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/add-document-to-workspace/add-document-to-workspace.use-case';
import { AddDocumentToWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/add-document-to-workspace/add-document-to-workspace.command';
import { RemoveDocumentFromWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/remove-document-from-workspace/remove-document-from-workspace.use-case';
import { RemoveDocumentFromWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/remove-document-from-workspace/remove-document-from-workspace.command';
import { UpdateWorkspaceInstructionUseCase } from 'src/domain/workspaces/application/use-cases/update-workspace-instruction/update-workspace-instruction.use-case';
import { UpdateWorkspaceInstructionCommand } from 'src/domain/workspaces/application/use-cases/update-workspace-instruction/update-workspace-instruction.command';
import { ListWorkspaceSkillsUseCase } from 'src/domain/workspaces/application/use-cases/list-workspace-skills/list-workspace-skills.use-case';
import { ListWorkspaceSkillsQuery } from 'src/domain/workspaces/application/use-cases/list-workspace-skills/list-workspace-skills.query';
import { ListWorkspaceKnowledgeBasesUseCase } from 'src/domain/workspaces/application/use-cases/list-workspace-knowledge-bases/list-workspace-knowledge-bases.use-case';
import { ListWorkspaceKnowledgeBasesQuery } from 'src/domain/workspaces/application/use-cases/list-workspace-knowledge-bases/list-workspace-knowledge-bases.query';
import { ListWorkspaceDocumentsUseCase } from 'src/domain/workspaces/application/use-cases/list-workspace-documents/list-workspace-documents.use-case';
import { ListWorkspaceDocumentsQuery } from 'src/domain/workspaces/application/use-cases/list-workspace-documents/list-workspace-documents.query';
import { WorkspaceContextDtoMapper } from 'src/domain/workspaces/presenters/http/mappers/workspace-context-dto.mapper';
import { WorkspaceDtoMapper } from 'src/domain/workspaces/presenters/http/mappers/workspace-dto.mapper';
import { UpdateWorkspaceInstructionDto } from 'src/domain/workspaces/presenters/http/dtos/update-workspace-instruction.dto';
import { WorkspaceContextListQueryDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-context-list-query.dto';
import {
  WorkspaceContextResponseDto,
  WorkspaceDocumentListResponseDto,
  WorkspaceKnowledgeBaseListResponseDto,
  WorkspaceSkillListResponseDto,
  WorkspaceDocumentResponseDto,
} from 'src/domain/workspaces/presenters/http/dtos/workspace-context-response.dto';
import { WorkspaceResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-response.dto';

const DocumentUploadInterceptor = createDocumentUploadInterceptor(
  25 * 1024 * 1024,
);

@ApiTags('workspaces')
@Controller('workspaces/:id/context')
@RequireFeature(FeatureFlag.Workspaces)
export class WorkspaceContextController {
  constructor(
    private readonly buildWorkspaceRunContextUseCase: BuildWorkspaceRunContextUseCase,
    private readonly addDocumentToWorkspaceUseCase: AddDocumentToWorkspaceUseCase,
    private readonly removeDocumentFromWorkspaceUseCase: RemoveDocumentFromWorkspaceUseCase,
    private readonly updateWorkspaceInstructionUseCase: UpdateWorkspaceInstructionUseCase,
    private readonly listWorkspaceSkillsUseCase: ListWorkspaceSkillsUseCase,
    private readonly listWorkspaceKnowledgeBasesUseCase: ListWorkspaceKnowledgeBasesUseCase,
    private readonly listWorkspaceDocumentsUseCase: ListWorkspaceDocumentsUseCase,
    private readonly contextDtoMapper: WorkspaceContextDtoMapper,
    private readonly workspaceDtoMapper: WorkspaceDtoMapper,
    @InjectPinoLogger(WorkspaceContextController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get workspace context' })
  @ApiResponse({ status: 200, type: WorkspaceContextResponseDto })
  async findContext(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<WorkspaceContextResponseDto> {
    const context = await this.buildWorkspaceRunContextUseCase.execute(
      new BuildWorkspaceRunContextQuery(id),
    );
    return this.contextDtoMapper.toContextDto(context);
  }

  @Get('skills')
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, default: 0 })
  @ApiResponse({ status: 200, type: WorkspaceSkillListResponseDto })
  async listSkills(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Query() queryParams: WorkspaceContextListQueryDto,
  ): Promise<WorkspaceSkillListResponseDto> {
    const page = await this.listWorkspaceSkillsUseCase.execute(
      new ListWorkspaceSkillsQuery({
        workspaceId: id,
        ...queryParams.toQuery(),
      }),
    );
    return this.contextDtoMapper.toSkillListDto(page);
  }

  @Get('knowledge-bases')
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, default: 0 })
  @ApiResponse({ status: 200, type: WorkspaceKnowledgeBaseListResponseDto })
  async listKnowledgeBases(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Query() queryParams: WorkspaceContextListQueryDto,
  ): Promise<WorkspaceKnowledgeBaseListResponseDto> {
    const page = await this.listWorkspaceKnowledgeBasesUseCase.execute(
      new ListWorkspaceKnowledgeBasesQuery({
        workspaceId: id,
        ...queryParams.toQuery(),
      }),
    );
    return this.contextDtoMapper.toKnowledgeBaseListDto(page);
  }

  @Get('documents')
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, default: 0 })
  @ApiResponse({ status: 200, type: WorkspaceDocumentListResponseDto })
  async listDocuments(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Query() queryParams: WorkspaceContextListQueryDto,
  ): Promise<WorkspaceDocumentListResponseDto> {
    const page = await this.listWorkspaceDocumentsUseCase.execute(
      new ListWorkspaceDocumentsQuery({
        workspaceId: id,
        ...queryParams.toQuery(),
      }),
    );
    return this.contextDtoMapper.toDocumentListDto(page);
  }

  @Post('documents')
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, type: WorkspaceDocumentResponseDto })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseInterceptors(DocumentUploadInterceptor)
  async addDocument(
    @Param('id', ParseUUIDPipe) id: UUID,
    @UploadedFile() file?: UploadedDocument,
  ): Promise<WorkspaceDocumentResponseDto> {
    if (!file) throw new MissingWorkspaceDocumentFileError();
    try {
      const fileType = this.resolveDocumentMimeType(file);
      const fileData = await fs.promises.readFile(file.path);
      const source = await this.addDocumentToWorkspaceUseCase.execute(
        new AddDocumentToWorkspaceCommand(
          id,
          fileData,
          file.originalname,
          fileType,
        ),
      );
      return this.contextDtoMapper.toDocumentDto(source);
    } finally {
      await this.cleanupTempFile(file.path);
    }
  }

  @Delete('documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDocument(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('documentId', ParseUUIDPipe) documentId: UUID,
  ): Promise<void> {
    await this.removeDocumentFromWorkspaceUseCase.execute(
      new RemoveDocumentFromWorkspaceCommand(id, documentId),
    );
  }

  @Patch('instruction')
  @ApiResponse({ status: 200, type: WorkspaceResponseDto })
  async updateInstruction(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateWorkspaceInstructionDto,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.updateWorkspaceInstructionUseCase.execute(
      new UpdateWorkspaceInstructionCommand(id, dto.instruction),
    );
    return this.workspaceDtoMapper.toDto(workspace);
  }

  private resolveDocumentMimeType(file: UploadedDocument): string {
    return resolveDocumentUploadMimeType({
      file,
      errorMessage: () => `Unsupported file type: ${file.originalname}`,
    });
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    await cleanupTempUploadFile(filePath, this.logger);
  }
}
