import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { CountKnowledgeBaseDocumentsUseCase } from 'src/domain/knowledge-bases/application/use-cases/count-knowledge-base-documents/count-knowledge-base-documents.use-case';
import { GetWorkspaceSkillsUseCase } from 'src/domain/skills/application/use-cases/get-workspace-skills/get-workspace-skills.use-case';
import { GetLinkedWorkspaceSkillsUseCase } from 'src/domain/skills/application/use-cases/get-linked-workspace-skills/get-linked-workspace-skills.use-case';
import { GetLinkedWorkspaceKnowledgeBasesUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-linked-workspace-knowledge-bases/get-linked-workspace-knowledge-bases.use-case';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
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
    private readonly access: WorkspaceAccessService,
    private readonly getLinkedSkills: GetLinkedWorkspaceSkillsUseCase,
    private readonly getLinkedKnowledgeBases: GetLinkedWorkspaceKnowledgeBasesUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: GetWorkspaceAiContextQuery,
  ): Promise<WorkspaceAiContext> {
    this.logger.log(
      { workspaceId: query.workspaceId },
      'getWorkspaceAiContext',
    );
    const { workspace } = await this.access.require(query.workspaceId, 'use');

    const refs = await this.workspacesRepository.getContextRefs(
      query.workspaceId,
    );
    const [skills, linkedSkills, knowledgeBases, linkedKnowledgeBases] =
      await Promise.all([
        this.getActiveSkills(query.workspaceId, refs.skillIds),
        this.getLinkedSkills.execute({ workspaceId: query.workspaceId }),
        this.withDocumentCounts(refs.knowledgeBases),
        this.getLinkedKnowledgeBaseContexts(query.workspaceId),
      ]);
    return {
      instruction: workspace.instruction,
      skills,
      linkedSkills,
      knowledgeBases,
      linkedKnowledgeBases,
    };
  }

  private async getLinkedKnowledgeBaseContexts(
    workspaceId: UUID,
  ): Promise<WorkspaceKnowledgeBaseContext[]> {
    const linked = await this.getLinkedKnowledgeBases.execute({ workspaceId });
    return this.withDocumentCounts(
      linked.map(({ id, name, description }) => ({
        id,
        name,
        description,
        documentCount: 0,
        isActive: true,
      })),
    );
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
