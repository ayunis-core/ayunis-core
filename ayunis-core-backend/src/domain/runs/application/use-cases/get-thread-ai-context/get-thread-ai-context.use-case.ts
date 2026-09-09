import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { CountKnowledgeBaseDocumentsUseCase } from 'src/domain/knowledge-bases/application/use-cases/count-knowledge-base-documents/count-knowledge-base-documents.use-case';
import { FindAccessibleKnowledgeBasesByIdsUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-accessible-knowledge-bases-by-ids/find-accessible-knowledge-bases-by-ids.use-case';
import { FindActiveKnowledgeBasesUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-active-knowledge-bases/find-active-knowledge-bases.use-case';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';
import { FindActiveSkillsQuery } from 'src/domain/skills/application/use-cases/find-active-skills/find-active-skills.query';
import { FindActiveSkillsUseCase } from 'src/domain/skills/application/use-cases/find-active-skills/find-active-skills.use-case';
import type { Skill } from 'src/domain/skills/domain/skill';
import { FindThreadContextRefsQuery } from 'src/domain/threads/application/use-cases/find-thread-context-refs/find-thread-context-refs.query';
import { FindThreadContextRefsUseCase } from 'src/domain/threads/application/use-cases/find-thread-context-refs/find-thread-context-refs.use-case';
import { GetWorkspaceAiContextQuery } from 'src/domain/workspaces/application/use-cases/get-workspace-ai-context/get-workspace-ai-context.query';
import { GetWorkspaceAiContextUseCase } from 'src/domain/workspaces/application/use-cases/get-workspace-ai-context/get-workspace-ai-context.use-case';
import type { WorkspaceAiContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';
import type {
  ThreadAiContext,
  ThreadAiContextKnowledgeBase,
  ThreadAiContextSkill,
} from 'src/domain/runs/application/models/thread-ai-context';
import { UnexpectedRunError } from 'src/domain/runs/application/runs.errors';
import { mergeKnowledgeBases } from 'src/domain/runs/application/services/merge-knowledge-bases';
import { featuresConfig } from 'src/config/features.config';
import { GetThreadAiContextQuery } from './get-thread-ai-context.query';

@Injectable()
export class GetThreadAiContextUseCase {
  private readonly logger = new Logger(GetThreadAiContextUseCase.name);

  constructor(
    private readonly findThreadContextRefs: FindThreadContextRefsUseCase,
    private readonly findActiveSkills: FindActiveSkillsUseCase,
    private readonly findActiveKnowledgeBases: FindActiveKnowledgeBasesUseCase,
    private readonly findAccessibleKnowledgeBasesByIds: FindAccessibleKnowledgeBasesByIdsUseCase,
    private readonly countKnowledgeBaseDocuments: CountKnowledgeBaseDocumentsUseCase,
    private readonly getWorkspaceAiContext: GetWorkspaceAiContextUseCase,
    @Inject(featuresConfig.KEY)
    private readonly features: ConfigType<typeof featuresConfig>,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRunError)
  async execute(query: GetThreadAiContextQuery): Promise<ThreadAiContext> {
    this.logger.log({ threadId: query.threadId }, 'Getting thread AI context');
    const refs = await this.findThreadContextRefs.execute(
      new FindThreadContextRefsQuery(query.threadId),
    );
    const [skills, activeKnowledgeBases, attachedKnowledgeBases, workspace] =
      await Promise.all([
        this.getActiveSkills(),
        this.findActiveKnowledgeBases.execute(),
        this.findAccessibleKnowledgeBasesByIds.execute({
          knowledgeBaseIds: refs.knowledgeBaseIds,
        }),
        this.getWorkspaceContext(refs.workspaceId),
      ]);
    return this.toContext(
      skills,
      activeKnowledgeBases,
      attachedKnowledgeBases,
      workspace,
      refs.workspaceId,
    );
  }

  private async toContext(
    skills: Skill[],
    activeKnowledgeBases: KnowledgeBaseSummary[],
    attachedKnowledgeBases: KnowledgeBaseSummary[],
    workspace: WorkspaceAiContext | undefined,
    workspaceId: UUID | null,
  ): Promise<ThreadAiContext> {
    const personalKnowledgeBases = mergeKnowledgeBases(
      activeKnowledgeBases,
      attachedKnowledgeBases,
    );
    const counts = await this.countKnowledgeBaseDocuments.execute({
      knowledgeBaseIds: personalKnowledgeBases.map(({ id }) => id),
    });
    return {
      skills: this.features.skillsEnabled
        ? [
            ...skills.map((skill) => this.toSkill(skill, null)),
            ...(workspace?.skills
              .filter(({ isActive }) => isActive)
              .map(({ skill }) => this.toSkill(skill, skill.workspaceId)) ??
              []),
          ]
        : [],
      knowledgeBases: [
        ...personalKnowledgeBases.map((knowledgeBase) =>
          this.toKnowledgeBase(
            knowledgeBase,
            counts.get(knowledgeBase.id) ?? 0,
            null,
          ),
        ),
        ...(workspace?.knowledgeBases
          .filter(({ isActive }) => isActive)
          .map((knowledgeBase) =>
            this.toKnowledgeBase(
              knowledgeBase,
              knowledgeBase.documentCount,
              workspaceId,
            ),
          ) ?? []),
      ],
    };
  }

  private toSkill(
    skill: Skill,
    workspaceId: UUID | null,
  ): ThreadAiContextSkill {
    return {
      id: skill.id,
      name: skill.name,
      shortDescription: skill.shortDescription,
      workspaceId,
    };
  }

  private toKnowledgeBase(
    knowledgeBase: KnowledgeBaseSummary,
    documentCount: number,
    workspaceId: UUID | null,
  ): ThreadAiContextKnowledgeBase {
    return {
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      documentCount,
      workspaceId,
    };
  }

  private getActiveSkills(): Promise<Skill[]> {
    if (!this.features.skillsEnabled) return Promise.resolve([]);
    return this.findActiveSkills.execute(new FindActiveSkillsQuery());
  }

  private getWorkspaceContext(
    workspaceId: UUID | null,
  ): Promise<WorkspaceAiContext | undefined> {
    if (!workspaceId) return Promise.resolve(undefined);
    return this.getWorkspaceAiContext.execute(
      new GetWorkspaceAiContextQuery(workspaceId),
    );
  }
}
