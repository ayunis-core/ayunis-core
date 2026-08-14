import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { FindOneSkillUseCase } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.use-case';
import { FindOneSkillQuery } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.query';
import { GetKnowledgeBasesByIdsUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.use-case';
import { GetKnowledgeBasesByIdsQuery } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.query';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { GetSourcesByIdsQuery } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.query';
import { WorkspacesRepository } from '../../ports/workspaces-repository.port';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import type {
  WorkspaceKnowledgeBaseContext,
  WorkspaceRunContext,
} from 'src/domain/workspaces/domain/workspace-run-context.entity';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from '../../workspaces.errors';
import { BuildWorkspaceRunContextQuery } from './build-workspace-run-context.query';

@Injectable()
export class BuildWorkspaceRunContextUseCase {
  constructor(
    @InjectPinoLogger(BuildWorkspaceRunContextUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly findOneSkillUseCase: FindOneSkillUseCase,
    private readonly getSourcesByIdsUseCase: GetSourcesByIdsUseCase,
    private readonly getKnowledgeBasesByIdsUseCase: GetKnowledgeBasesByIdsUseCase,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: BuildWorkspaceRunContextQuery,
  ): Promise<WorkspaceRunContext> {
    this.logger.info(
      { workspaceId: query.workspaceId },
      'buildWorkspaceRunContext',
    );
    const workspace = await this.findWorkspace(query.workspaceId);

    const refs = await this.workspacesRepository.getContextRefs(
      query.workspaceId,
    );
    const [skills, knowledgeBases] = await Promise.all([
      this.findAssignedSkills(refs.skillIds),
      this.findAssignedKnowledgeBases(refs.knowledgeBases),
    ]);
    const sourceIds = this.collectRuntimeSourceIds(refs.sourceIds, skills);
    const [runtimeSources, skillKnowledgeBases] = await Promise.all([
      this.getSourcesByIdsUseCase.execute(new GetSourcesByIdsQuery(sourceIds)),
      this.getSkillKnowledgeBases(skills),
    ]);
    const workspaceSourceIds = new Set(refs.sourceIds);
    const workspaceSources = runtimeSources.filter((source) =>
      workspaceSourceIds.has(source.id),
    );
    const runtimeKnowledgeBases = this.mergeKnowledgeBases(
      knowledgeBases,
      skillKnowledgeBases,
    );

    return {
      instruction: workspace.instruction,
      skills,
      knowledgeBases,
      sources: workspaceSources,
      runtimeKnowledgeBases,
      runtimeSources,
      mcpIntegrationIds: this.unique(
        skills.flatMap((skill) => skill.mcpIntegrationIds),
      ),
    };
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

  private collectRuntimeSourceIds(sourceIds: UUID[], skills: Skill[]): UUID[] {
    return this.unique([
      ...sourceIds,
      ...skills.flatMap((skill) => skill.sourceIds),
    ]);
  }

  private async findAssignedSkills(skillIds: UUID[]): Promise<Skill[]> {
    const skillResults = await Promise.all(
      skillIds.map((skillId) => this.findAssignedSkill(skillId)),
    );
    return skillResults.filter((skill): skill is Skill => skill !== null);
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
    const accessibleKnowledgeBases = results.filter(
      (knowledgeBase): knowledgeBase is WorkspaceKnowledgeBaseContext =>
        knowledgeBase !== null,
    );
    return this.withDocumentCounts(accessibleKnowledgeBases);
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
    const documentCounts =
      await this.knowledgeBaseAccessService.countSourcesByKnowledgeBaseIds(
        knowledgeBases.map((knowledgeBase) => knowledgeBase.id),
      );
    return knowledgeBases.map((knowledgeBase) => ({
      ...knowledgeBase,
      documentCount: documentCounts.get(knowledgeBase.id) ?? 0,
    }));
  }

  private async getSkillKnowledgeBases(
    skills: Skill[],
  ): Promise<WorkspaceKnowledgeBaseContext[]> {
    const knowledgeBaseIds = this.unique(
      skills.flatMap((skill) => skill.knowledgeBaseIds),
    );
    const knowledgeBases = await this.getKnowledgeBasesByIdsUseCase.execute(
      new GetKnowledgeBasesByIdsQuery(knowledgeBaseIds),
    );
    return knowledgeBases.map((kb) => ({
      id: kb.id,
      name: kb.name,
      description: kb.description,
      documentCount: 0,
    }));
  }

  private mergeKnowledgeBases(
    workspaceKnowledgeBases: WorkspaceKnowledgeBaseContext[],
    skillKnowledgeBases: WorkspaceKnowledgeBaseContext[],
  ): WorkspaceKnowledgeBaseContext[] {
    const seen = new Set(workspaceKnowledgeBases.map((kb) => kb.id));
    return [
      ...workspaceKnowledgeBases,
      ...skillKnowledgeBases.filter((kb) => !seen.has(kb.id)),
    ];
  }

  private unique(ids: UUID[]): UUID[] {
    return [...new Set(ids)];
  }
}
