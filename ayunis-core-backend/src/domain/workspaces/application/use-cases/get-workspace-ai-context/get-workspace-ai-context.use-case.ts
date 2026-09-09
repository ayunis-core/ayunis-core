import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CountKnowledgeBaseDocumentsUseCase } from 'src/domain/knowledge-bases/application/use-cases/count-knowledge-base-documents/count-knowledge-base-documents.use-case';
import { GetWorkspaceSkillsUseCase } from 'src/domain/skills/application/use-cases/get-workspace-skills/get-workspace-skills.use-case';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import type {
  WorkspaceAiContext,
  WorkspaceKnowledgeBaseContext,
  WorkspaceSkillContext,
} from 'src/domain/workspaces/domain/workspace-run-context.entity';
import { GetWorkspaceAiContextQuery } from './get-workspace-ai-context.query';

@Injectable()
export class GetWorkspaceAiContextUseCase {
  private readonly logger = new Logger(GetWorkspaceAiContextUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly getWorkspaceSkills: GetWorkspaceSkillsUseCase,
    private readonly countKnowledgeBaseDocuments: CountKnowledgeBaseDocumentsUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: GetWorkspaceAiContextQuery,
  ): Promise<WorkspaceAiContext> {
    this.logger.log(
      { workspaceId: query.workspaceId },
      'getWorkspaceAiContext',
    );
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const workspace = await this.workspacesRepository.findById(
      userId,
      query.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(query.workspaceId);

    const refs = await this.workspacesRepository.getContextRefs(
      query.workspaceId,
    );
    const [skills, knowledgeBases] = await Promise.all([
      this.getActiveSkills(query.workspaceId, refs.skillIds),
      this.withDocumentCounts(refs.knowledgeBases),
    ]);
    return { instruction: workspace.instruction, skills, knowledgeBases };
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
      .filter(({ isActive }) => isActive)
      .sort(
        (a, b) =>
          Number(b.isPinned) - Number(a.isPinned) ||
          a.skill.name.localeCompare(b.skill.name),
      );
  }

  private async withDocumentCounts(
    knowledgeBases: WorkspaceKnowledgeBaseContext[],
  ): Promise<WorkspaceKnowledgeBaseContext[]> {
    const active = knowledgeBases.filter(({ isActive }) => isActive);
    const counts = await this.countKnowledgeBaseDocuments.execute({
      knowledgeBaseIds: active.map(({ id }) => id),
    });
    return active.map((knowledgeBase) => ({
      ...knowledgeBase,
      documentCount: counts.get(knowledgeBase.id) ?? 0,
    }));
  }
}
