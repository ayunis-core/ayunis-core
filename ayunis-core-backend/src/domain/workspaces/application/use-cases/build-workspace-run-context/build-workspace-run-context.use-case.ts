import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { GetWorkspaceSkillsUseCase } from 'src/domain/skills/application/use-cases/get-workspace-skills/get-workspace-skills.use-case';
import { CountKnowledgeBaseDocumentsUseCase } from 'src/domain/knowledge-bases/application/use-cases/count-knowledge-base-documents/count-knowledge-base-documents.use-case';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';

import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import type {
  WorkspaceKnowledgeBaseContext,
  WorkspaceRunContext,
  WorkspaceSkillContext,
} from 'src/domain/workspaces/domain/workspace-run-context.entity';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { BuildWorkspaceRunContextQuery } from './build-workspace-run-context.query';

@Injectable()
export class BuildWorkspaceRunContextUseCase {
  private readonly logger = new Logger(BuildWorkspaceRunContextUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly getWorkspaceSkills: GetWorkspaceSkillsUseCase,
    private readonly countKnowledgeBaseDocuments: CountKnowledgeBaseDocumentsUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: BuildWorkspaceRunContextQuery,
  ): Promise<WorkspaceRunContext> {
    this.logger.log(
      { workspaceId: query.workspaceId },
      'buildWorkspaceRunContext',
    );
    const workspace = await this.findWorkspace(query.workspaceId);

    const refs = await this.workspacesRepository.getContextRefs(
      query.workspaceId,
    );
    const [skillContexts, knowledgeBases] = await Promise.all([
      this.getActiveSkills(workspace.id, refs.skillIds),
      this.withDocumentCounts(refs.knowledgeBases),
    ]);

    return {
      instruction: workspace.instruction,
      skills: skillContexts,
      knowledgeBases,
      runtimeKnowledgeBases: knowledgeBases,
    };
  }

  private async getActiveSkills(
    workspaceId: UUID,
    skillIds: UUID[],
  ): Promise<WorkspaceSkillContext[]> {
    const skills = await this.getWorkspaceSkills.execute({
      workspaceId,
      ids: skillIds,
    });
    return skills
      .filter((context) => context.isActive)
      .sort(
        (a, b) =>
          Number(b.isPinned) - Number(a.isPinned) ||
          a.skill.name.localeCompare(b.skill.name),
      );
  }

  private async findWorkspace(workspaceId: UUID): Promise<Workspace> {
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const workspace = await this.workspacesRepository.findById(
      userId,
      workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(workspaceId);
    return workspace;
  }

  private async withDocumentCounts(
    knowledgeBases: WorkspaceKnowledgeBaseContext[],
  ): Promise<WorkspaceKnowledgeBaseContext[]> {
    const activeKnowledgeBases = knowledgeBases.filter(
      (knowledgeBase) => knowledgeBase.isActive,
    );
    const documentCounts = await this.countKnowledgeBaseDocuments.execute({
      knowledgeBaseIds: activeKnowledgeBases.map(
        (knowledgeBase) => knowledgeBase.id,
      ),
    });
    return activeKnowledgeBases.map((knowledgeBase) => ({
      ...knowledgeBase,
      documentCount: documentCounts.get(knowledgeBase.id) ?? 0,
    }));
  }
}
