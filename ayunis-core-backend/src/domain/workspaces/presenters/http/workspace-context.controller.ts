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
import { MissingWorkspaceDocumentFileError } from '../../application/workspaces.errors';
import { BuildWorkspaceRunContextUseCase } from '../../application/use-cases/build-workspace-run-context/build-workspace-run-context.use-case';
import { BuildWorkspaceRunContextQuery } from '../../application/use-cases/build-workspace-run-context/build-workspace-run-context.query';
import { AttachSkillToWorkspaceUseCase } from '../../application/use-cases/attach-skill-to-workspace/attach-skill-to-workspace.use-case';
import { AttachSkillToWorkspaceCommand } from '../../application/use-cases/attach-skill-to-workspace/attach-skill-to-workspace.command';
import { DetachSkillFromWorkspaceUseCase } from '../../application/use-cases/detach-skill-from-workspace/detach-skill-from-workspace.use-case';
import { DetachSkillFromWorkspaceCommand } from '../../application/use-cases/detach-skill-from-workspace/detach-skill-from-workspace.command';
import { AttachKnowledgeBaseToWorkspaceUseCase } from '../../application/use-cases/attach-knowledge-base-to-workspace/attach-knowledge-base-to-workspace.use-case';
import { AttachKnowledgeBaseToWorkspaceCommand } from '../../application/use-cases/attach-knowledge-base-to-workspace/attach-knowledge-base-to-workspace.command';
import { DetachKnowledgeBaseFromWorkspaceUseCase } from '../../application/use-cases/detach-knowledge-base-from-workspace/detach-knowledge-base-from-workspace.use-case';
import { DetachKnowledgeBaseFromWorkspaceCommand } from '../../application/use-cases/detach-knowledge-base-from-workspace/detach-knowledge-base-from-workspace.command';
import { AddDocumentToWorkspaceUseCase } from '../../application/use-cases/add-document-to-workspace/add-document-to-workspace.use-case';
import { AddDocumentToWorkspaceCommand } from '../../application/use-cases/add-document-to-workspace/add-document-to-workspace.command';
import { RemoveDocumentFromWorkspaceUseCase } from '../../application/use-cases/remove-document-from-workspace/remove-document-from-workspace.use-case';
import { RemoveDocumentFromWorkspaceCommand } from '../../application/use-cases/remove-document-from-workspace/remove-document-from-workspace.command';
import { UpdateWorkspaceInstructionUseCase } from '../../application/use-cases/update-workspace-instruction/update-workspace-instruction.use-case';
import { UpdateWorkspaceInstructionCommand } from '../../application/use-cases/update-workspace-instruction/update-workspace-instruction.command';
import { ListWorkspaceSkillCandidatesUseCase } from '../../application/use-cases/list-workspace-skill-candidates/list-workspace-skill-candidates.use-case';
import { ListWorkspaceSkillCandidatesQuery } from '../../application/use-cases/list-workspace-skill-candidates/list-workspace-skill-candidates.query';
import { ListWorkspaceKnowledgeBaseCandidatesUseCase } from '../../application/use-cases/list-workspace-knowledge-base-candidates/list-workspace-knowledge-base-candidates.use-case';
import { ListWorkspaceKnowledgeBaseCandidatesQuery } from '../../application/use-cases/list-workspace-knowledge-base-candidates/list-workspace-knowledge-base-candidates.query';
import { WorkspaceContextDtoMapper } from './mappers/workspace-context-dto.mapper';
import { WorkspaceDtoMapper } from './mappers/workspace-dto.mapper';
import { UpdateWorkspaceInstructionDto } from './dtos/update-workspace-instruction.dto';
import {
  WorkspaceContextResponseDto,
  WorkspaceDocumentResponseDto,
  WorkspaceKnowledgeBaseCandidateResponseDto,
  WorkspaceSkillCandidateResponseDto,
} from './dtos/workspace-context-response.dto';
import { WorkspaceResponseDto } from './dtos/workspace-response.dto';

const DocumentUploadInterceptor = createDocumentUploadInterceptor(
  25 * 1024 * 1024,
);

@ApiTags('workspaces')
@Controller('workspaces/:id/context')
@RequireFeature(FeatureFlag.Workspaces)
export class WorkspaceContextController {
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

  @Get('skill-candidates')
  @ApiResponse({ status: 200, type: [WorkspaceSkillCandidateResponseDto] })
  async listSkillCandidates(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<WorkspaceSkillCandidateResponseDto[]> {
    const candidates = await this.listWorkspaceSkillCandidatesUseCase.execute(
      new ListWorkspaceSkillCandidatesQuery(id),
    );
    return candidates.map(({ skill, isAttached }) => ({
      ...this.contextDtoMapper.toSkillDto(skill),
      isAttached,
    }));
  }

  @Get('knowledge-base-candidates')
  @ApiResponse({
    status: 200,
    type: [WorkspaceKnowledgeBaseCandidateResponseDto],
  })
  async listKnowledgeBaseCandidates(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<WorkspaceKnowledgeBaseCandidateResponseDto[]> {
    const candidates =
      await this.listWorkspaceKnowledgeBaseCandidatesUseCase.execute(
        new ListWorkspaceKnowledgeBaseCandidatesQuery(id),
      );
    return candidates.map(({ knowledgeBase, documentCount, isAttached }) => ({
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      description: knowledgeBase.description,
      documentCount,
      isAttached,
    }));
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
