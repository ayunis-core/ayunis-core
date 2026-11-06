import { Injectable, Logger } from '@nestjs/common';
import { FindActiveKnowledgeBasesUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-active-knowledge-bases/find-active-knowledge-bases.use-case';
import { FindActiveAlwaysOnTemplatesQuery } from 'src/domain/skill-templates/application/use-cases/find-active-always-on-templates/find-active-always-on-templates.query';
import { FindActiveAlwaysOnTemplatesUseCase } from 'src/domain/skill-templates/application/use-cases/find-active-always-on-templates/find-active-always-on-templates.use-case';
import type { Skill } from 'src/domain/skills/domain/skill';
import type { SkillTemplate } from 'src/domain/skill-templates/domain/skill-template.entity';
import { FindActiveSkillsQuery } from 'src/domain/skills/application/use-cases/find-active-skills/find-active-skills.query';
import { FindActiveSkillsUseCase } from 'src/domain/skills/application/use-cases/find-active-skills/find-active-skills.use-case';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { BuildWorkspaceRunContextQuery } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.query';
import { BuildWorkspaceRunContextUseCase } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.use-case';
import type { WorkspaceRunContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';
import { mergeKnowledgeBases } from 'src/domain/runs/application/services/merge-knowledge-bases';
import type {
  RunCapabilityContext,
  RunCapabilityInput,
  SkillCatalog,
} from './run-capability-context';
import { buildSkillCatalog } from './skill-catalog.helper';

@Injectable()
export class RunCapabilityContextFactory {
  private readonly logger = new Logger(RunCapabilityContextFactory.name);

  constructor(
    private readonly buildWorkspaceRunContextUseCase: BuildWorkspaceRunContextUseCase,
    private readonly findActiveSkillsUseCase: FindActiveSkillsUseCase,
    private readonly findActiveKnowledgeBasesUseCase: FindActiveKnowledgeBasesUseCase,
    private readonly findActiveAlwaysOnTemplatesUseCase: FindActiveAlwaysOnTemplatesUseCase,
  ) {}

  async create(input: RunCapabilityInput): Promise<RunCapabilityContext> {
    const workspaceContext = await this.buildWorkspaceContext(input.thread);
    return {
      ...input,
      now: new Date(),
      workspaceContext,
      threadSources: mergeById(
        [],
        input.thread.sourceAssignments?.map((a) => a.source) ?? [],
      ),
      knowledgeBases: memoize(async () =>
        mergeKnowledgeBases(
          input.thread.getUniqueKnowledgeBases(),
          workspaceContext?.runtimeKnowledgeBases ?? [],
          await this.findActiveKnowledgeBasesUseCase.execute(),
        ),
      ),
      skillCatalog: memoize(() => this.loadSkillCatalog(workspaceContext)),
    };
  }

  private async buildWorkspaceContext(
    thread: Thread,
  ): Promise<WorkspaceRunContext | undefined> {
    if (!thread.workspaceId) return undefined;
    return this.buildWorkspaceRunContextUseCase.execute(
      new BuildWorkspaceRunContextQuery(thread.workspaceId),
    );
  }

  private async loadSkillCatalog(
    workspaceContext?: WorkspaceRunContext,
  ): Promise<SkillCatalog> {
    const [activeSkills, alwaysOnTemplates] = await Promise.all([
      this.findActiveSkillsUseCase.execute(new FindActiveSkillsQuery()),
      this.fetchAlwaysOnTemplates(),
    ]);
    const workspaceSkills =
      workspaceContext?.skills.map(({ skill }) => skill) ?? [];
    return buildSkillCatalog(
      mergeById<Skill>(activeSkills, workspaceSkills),
      alwaysOnTemplates,
      this.logger,
    );
  }

  /** Failures are swallowed so a templates outage never blocks a run. */
  private async fetchAlwaysOnTemplates(): Promise<SkillTemplate[]> {
    try {
      return await this.findActiveAlwaysOnTemplatesUseCase.execute(
        new FindActiveAlwaysOnTemplatesQuery(),
      );
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to fetch always-on templates, continuing without them',
      );
      return [];
    }
  }
}

function memoize<T>(load: () => Promise<T>): () => Promise<T> {
  let loaded: Promise<T> | undefined;
  return () => (loaded ??= load());
}

function mergeById<T extends { id: string }>(base: T[], additional: T[]): T[] {
  const result = [...base];
  const seen = new Set(base.map((item) => item.id));
  for (const item of additional) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}
