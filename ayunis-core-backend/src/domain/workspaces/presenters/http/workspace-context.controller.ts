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
  Logger,
} from '@nestjs/common';
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
import { AttachSkillToWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/attach-skill-to-workspace/attach-skill-to-workspace.use-case';
import { AttachSkillToWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/attach-skill-to-workspace/attach-skill-to-workspace.command';
import { DetachSkillFromWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/detach-skill-from-workspace/detach-skill-from-workspace.use-case';
import { DetachSkillFromWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/detach-skill-from-workspace/detach-skill-from-workspace.command';
import { AttachKnowledgeBaseToWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/attach-knowledge-base-to-workspace/attach-knowledge-base-to-workspace.use-case';
import { AttachKnowledgeBaseToWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/attach-knowledge-base-to-workspace/attach-knowledge-base-to-workspace.command';
import { DetachKnowledgeBaseFromWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/detach-knowledge-base-from-workspace/detach-knowledge-base-from-workspace.use-case';
import { DetachKnowledgeBaseFromWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/detach-knowledge-base-from-workspace/detach-knowledge-base-from-workspace.command';
import { AddDocumentToWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/add-document-to-workspace/add-document-to-workspace.use-case';
import { AddDocumentToWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/add-document-to-workspace/add-document-to-workspace.command';
import { RemoveDocumentFromWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/remove-document-from-workspace/remove-document-from-workspace.use-case';
import { RemoveDocumentFromWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/remove-document-from-workspace/remove-document-from-workspace.command';
import { UpdateWorkspaceInstructionUseCase } from 'src/domain/workspaces/application/use-cases/update-workspace-instruction/update-workspace-instruction.use-case';
import { UpdateWorkspaceInstructionCommand } from 'src/domain/workspaces/application/use-cases/update-workspace-instruction/update-workspace-instruction.command';
import { ListWorkspaceSkillCandidatesUseCase } from 'src/domain/workspaces/application/use-cases/list-workspace-skill-candidates/list-workspace-skill-candidates.use-case';
import { ListWorkspaceSkillCandidatesQuery } from 'src/domain/workspaces/application/use-cases/list-workspace-skill-candidates/list-workspace-skill-candidates.query';
import { ListWorkspaceKnowledgeBaseCandidatesUseCase } from 'src/domain/workspaces/application/use-cases/list-workspace-knowledge-base-candidates/list-workspace-knowledge-base-candidates.use-case';
import { ListWorkspaceKnowledgeBaseCandidatesQuery } from 'src/domain/workspaces/application/use-cases/list-workspace-knowledge-base-candidates/list-workspace-knowledge-base-candidates.query';
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
  WorkspaceKnowledgeBaseCandidateListResponseDto,
  WorkspaceKnowledgeBaseListResponseDto,
  WorkspaceSkillCandidateListResponseDto,
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
  private readonly logger = new Logger(WorkspaceContextController.name);

  constructor(
    private readonly buildWorkspaceRunContextUseCase: BuildWorkspaceRunContextUseCase,
    private readonly attachSkillToWorkspaceUseCase: AttachSkillToWorkspaceUseCase,
    private readonly detachSkillFromWorkspaceUseCase: DetachSkillFromWorkspaceUseCase,
    private readonly attachKnowledgeBaseToWorkspaceUseCase: AttachKnowledgeBaseToWorkspaceUseCase,
    private readonly detachKnowledgeBaseFromWorkspaceUseCase: DetachKnowledgeBaseFromWorkspaceUseCase,
    private readonly addDocumentToWorkspaceUseCase: AddDocumentToWorkspaceUseCase,
    private readonly removeDocumentFromWorkspaceUseCase: RemoveDocumentFromWorkspaceUseCase,
    private readonly updateWorkspaceInstructionUseCase: UpdateWorkspaceInstructionUseCase,
    private readonly listWorkspaceSkillCandidatesUseCase: ListWorkspaceSkillCandidatesUseCase,
    private readonly listWorkspaceKnowledgeBaseCandidatesUseCase: ListWorkspaceKnowledgeBaseCandidatesUseCase,
    private readonly listWorkspaceSkillsUseCase: ListWorkspaceSkillsUseCase,
    private readonly listWorkspaceKnowledgeBasesUseCase: ListWorkspaceKnowledgeBasesUseCase,
    private readonly listWorkspaceDocumentsUseCase: ListWorkspaceDocumentsUseCase,
    private readonly contextDtoMapper: WorkspaceContextDtoMapper,
    private readonly workspaceDtoMapper: WorkspaceDtoMapper,
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

  @Get('skill-candidates')
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, default: 0 })
  @ApiResponse({ status: 200, type: WorkspaceSkillCandidateListResponseDto })
  async listSkillCandidates(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Query() queryParams: WorkspaceContextListQueryDto,
  ): Promise<WorkspaceSkillCandidateListResponseDto> {
    const page = await this.listWorkspaceSkillCandidatesUseCase.execute(
      new ListWorkspaceSkillCandidatesQuery({
        workspaceId: id,
        ...queryParams.toQuery(),
      }),
    );
    return this.contextDtoMapper.toSkillCandidateListDto(page);
  }

  @Get('knowledge-base-candidates')
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, default: 0 })
  @ApiResponse({
    status: 200,
    type: WorkspaceKnowledgeBaseCandidateListResponseDto,
  })
  async listKnowledgeBaseCandidates(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Query() queryParams: WorkspaceContextListQueryDto,
  ): Promise<WorkspaceKnowledgeBaseCandidateListResponseDto> {
    const page = await this.listWorkspaceKnowledgeBaseCandidatesUseCase.execute(
      new ListWorkspaceKnowledgeBaseCandidatesQuery({
        workspaceId: id,
        ...queryParams.toQuery(),
      }),
    );
    return this.contextDtoMapper.toKnowledgeBaseCandidateListDto(page);
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

  @Post('skills/:skillId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async attachSkill(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
  ): Promise<void> {
    await this.attachSkillToWorkspaceUseCase.execute(
      new AttachSkillToWorkspaceCommand(id, skillId),
    );
  }

  @Delete('skills/:skillId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async detachSkill(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('skillId', ParseUUIDPipe) skillId: UUID,
  ): Promise<void> {
    await this.detachSkillFromWorkspaceUseCase.execute(
      new DetachSkillFromWorkspaceCommand(id, skillId),
    );
  }

  @Post('knowledge-bases/:knowledgeBaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async attachKnowledgeBase(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: UUID,
  ): Promise<void> {
    await this.attachKnowledgeBaseToWorkspaceUseCase.execute(
      new AttachKnowledgeBaseToWorkspaceCommand(id, knowledgeBaseId),
    );
  }

  @Delete('knowledge-bases/:knowledgeBaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async detachKnowledgeBase(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: UUID,
  ): Promise<void> {
    await this.detachKnowledgeBaseFromWorkspaceUseCase.execute(
      new DetachKnowledgeBaseFromWorkspaceCommand(id, knowledgeBaseId),
    );
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
