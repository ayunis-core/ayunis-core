import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { GetKnowledgeBasesByIdsQuery } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.query';
import { GetKnowledgeBasesByIdsUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.use-case';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { FindOneSkillQuery } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.query';
import { FindOneSkillUseCase } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.use-case';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import { GetSourcesByIdsQuery } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.query';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import type { WorkspaceContextRefs } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import type {
  WorkspaceKnowledgeBaseContext,
  WorkspaceRunContext,
} from 'src/domain/workspaces/domain/workspace-run-context.entity';

type WorkspaceRunResources = Omit<WorkspaceRunContext, 'instruction'>;

@Injectable()
export class WorkspaceRunContextResolverService {
  constructor(
    @InjectPinoLogger(WorkspaceRunContextResolverService.name)
    private readonly logger: PinoLogger,
    private readonly findOneSkillUseCase: FindOneSkillUseCase,
    private readonly getSourcesByIdsUseCase: GetSourcesByIdsUseCase,
    private readonly getKnowledgeBasesByIdsUseCase: GetKnowledgeBasesByIdsUseCase,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
  ) {}

  async resolve(refs: WorkspaceContextRefs): Promise<WorkspaceRunResources> {
    const [skills, knowledgeBases] = await Promise.all([
      this.findAssignedSkills(refs.skillIds),
      this.findAssignedKnowledgeBases(refs.knowledgeBases),
    ]);
    const sourceIds = this.unique([
      ...refs.sourceIds,
      ...skills.flatMap((skill) => skill.sourceIds),
    ]);
    const [runtimeSources, skillKnowledgeBases] = await Promise.all([
      this.getSourcesByIdsUseCase.execute(new GetSourcesByIdsQuery(sourceIds)),
      this.getSkillKnowledgeBases(skills),
    ]);
    const workspaceSourceIds = new Set(refs.sourceIds);
    return {
      skills,
      knowledgeBases,
      sources: runtimeSources.filter((source) =>
        workspaceSourceIds.has(source.id),
      ),
      runtimeKnowledgeBases: this.mergeKnowledgeBases(
        knowledgeBases,
        skillKnowledgeBases,
      ),
      runtimeSources,
      mcpIntegrationIds: this.unique(
        skills.flatMap((skill) => skill.mcpIntegrationIds),
      ),
    };
  }

  private async findAssignedSkills(skillIds: UUID[]): Promise<Skill[]> {
    const results = await Promise.all(
      skillIds.map((skillId) => this.findAssignedSkill(skillId)),
    );
    return results.filter((skill): skill is Skill => skill !== null);
  }

  private async findAssignedSkill(skillId: UUID): Promise<Skill | null> {
    try {
      const result = await this.findOneSkillUseCase.execute(
        new FindOneSkillQuery(skillId),
      );
      return result.skill;
    } catch (error) {
      if (!(error instanceof SkillNotFoundError)) throw error;
      this.logger.warn('Skipping inaccessible workspace skill assignment', {
        skillId,
      });
      return null;
    }
  }

  private async findAssignedKnowledgeBases(
    knowledgeBases: WorkspaceKnowledgeBaseContext[],
  ): Promise<WorkspaceKnowledgeBaseContext[]> {
    const results = await Promise.all(
      knowledgeBases.map((knowledgeBase) =>
        this.findAssignedKnowledgeBase(knowledgeBase),
      ),
    );
    const accessible = results.filter(
      (knowledgeBase): knowledgeBase is WorkspaceKnowledgeBaseContext =>
        knowledgeBase !== null,
    );
    return this.withDocumentCounts(accessible);
  }

  private async findAssignedKnowledgeBase(
    knowledgeBase: WorkspaceKnowledgeBaseContext,
  ): Promise<WorkspaceKnowledgeBaseContext | null> {
    try {
      await this.knowledgeBaseAccessService.findAccessibleKnowledgeBase(
        knowledgeBase.id,
      );
      return knowledgeBase;
    } catch (error) {
      if (!(error instanceof KnowledgeBaseNotFoundError)) throw error;
      this.logger.warn('Skipping inaccessible workspace knowledge base', {
        knowledgeBaseId: knowledgeBase.id,
      });
      return null;
    }
  }

  private async withDocumentCounts(
    knowledgeBases: WorkspaceKnowledgeBaseContext[],
  ): Promise<WorkspaceKnowledgeBaseContext[]> {
    const counts =
      await this.knowledgeBaseAccessService.countSourcesByKnowledgeBaseIds(
        knowledgeBases.map(({ id }) => id),
      );
    return knowledgeBases.map((knowledgeBase) => ({
      ...knowledgeBase,
      documentCount: counts.get(knowledgeBase.id) ?? 0,
    }));
  }

  private async getSkillKnowledgeBases(
    skills: Skill[],
  ): Promise<WorkspaceKnowledgeBaseContext[]> {
    const ids = this.unique(skills.flatMap((skill) => skill.knowledgeBaseIds));
    const knowledgeBases = await this.getKnowledgeBasesByIdsUseCase.execute(
      new GetKnowledgeBasesByIdsQuery(ids),
    );
    return knowledgeBases.map((knowledgeBase) => ({
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      description: knowledgeBase.description,
      documentCount: 0,
    }));
  }

  private mergeKnowledgeBases(
    workspaceKnowledgeBases: WorkspaceKnowledgeBaseContext[],
    skillKnowledgeBases: WorkspaceKnowledgeBaseContext[],
  ): WorkspaceKnowledgeBaseContext[] {
    const seen = new Set(workspaceKnowledgeBases.map(({ id }) => id));
    return [
      ...workspaceKnowledgeBases,
      ...skillKnowledgeBases.filter(({ id }) => !seen.has(id)),
    ];
  }

  private unique(ids: UUID[]): UUID[] {
    return [...new Set(ids)];
  }
}
