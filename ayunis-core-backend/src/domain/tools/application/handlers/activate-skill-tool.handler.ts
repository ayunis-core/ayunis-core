import { ActivateWorkspaceSkillByNameUseCase } from 'src/domain/skills/application/use-cases/activate-workspace-skill-by-name/activate-workspace-skill-by-name.use-case';
import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ActivateSkillTool } from 'src/domain/tools/domain/tools/activate-skill-tool.entity';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { FindSkillByNameUseCase } from 'src/domain/skills/application/use-cases/find-skill-by-name/find-skill-by-name.use-case';
import { FindSkillByNameQuery } from 'src/domain/skills/application/use-cases/find-skill-by-name/find-skill-by-name.query';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { SkillActivationService } from 'src/domain/skills/application/services/skill-activation.service';
import { FindAlwaysOnTemplateByNameUseCase } from 'src/domain/skill-templates/application/use-cases/find-always-on-template-by-name/find-always-on-template-by-name.use-case';
import { FindAlwaysOnTemplateByNameQuery } from 'src/domain/skill-templates/application/use-cases/find-always-on-template-by-name/find-always-on-template-by-name.query';
import {
  parseSkillSlug,
  SYSTEM_PREFIX,
  USER_PREFIX,
  WORKSPACE_PREFIX,
  TEAM_PREFIX,
  ORG_PREFIX,
  type SkillPrefix,
} from 'src/common/util/skill-slug';
import { FindActiveCollectiveSkillByNameUseCase } from 'src/domain/skills/application/use-cases/find-active-collective-skill-by-name/find-active-collective-skill-by-name.use-case';
import { FindActiveCollectiveSkillByNameQuery } from 'src/domain/skills/application/use-cases/find-active-collective-skill-by-name/find-active-collective-skill-by-name.query';

@Injectable()
export class ActivateSkillToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(ActivateSkillToolHandler.name);

  constructor(
    private readonly findSkillByNameUseCase: FindSkillByNameUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly skillActivationService: SkillActivationService,
    private readonly findAlwaysOnTemplateByNameUseCase: FindAlwaysOnTemplateByNameUseCase,
    private readonly activateWorkspaceSkillByName: ActivateWorkspaceSkillByNameUseCase,
    private readonly findActiveCollectiveSkillByName: FindActiveCollectiveSkillByNameUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: ActivateSkillTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    const { threadId } = context;
    this.logger.log({ name: tool.name, input: input }, 'execute');

    try {
      const validatedInput = tool.validateParams(input);
      const fullSlug = validatedInput.skill_slug;
      const originalName = this.resolveSkillName(tool, fullSlug);
      const { prefix } = parseSkillSlug(fullSlug);
      return await this.activateByPrefix(
        tool.name,
        prefix,
        originalName,
        threadId,
      );
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error({ err: error }, 'execute');
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }

  private async activateByPrefix(
    toolName: string,
    prefix: SkillPrefix,
    name: string,
    threadId: UUID,
  ): Promise<string> {
    switch (prefix) {
      case SYSTEM_PREFIX:
        return this.activateSystemTemplate(toolName, name);
      case WORKSPACE_PREFIX:
        return (
          await this.activateWorkspaceSkillByName.execute({ threadId, name })
        ).instructions;
      case USER_PREFIX:
        return this.activateUserSkill(toolName, name, threadId);
      case TEAM_PREFIX:
      case ORG_PREFIX:
        return this.activateCollectiveSkill(name, prefix, threadId);
      default: {
        const _exhaustive: never = prefix;
        throw new ToolExecutionFailedError({
          toolName,
          message: `Unknown skill prefix: "${String(_exhaustive)}"`,
          exposeToLLM: true,
        });
      }
    }
  }

  private resolveSkillName(tool: ActivateSkillTool, slug: string): string {
    const name = tool.resolveOriginalName(slug);
    if (!name) {
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: `Could not resolve slug "${slug}" to a skill name`,
        exposeToLLM: true,
      });
    }
    return name;
  }

  private async activateSystemTemplate(
    toolName: string,
    templateName: string,
  ): Promise<string> {
    const template = await this.findAlwaysOnTemplateByNameUseCase.execute(
      new FindAlwaysOnTemplateByNameQuery(templateName),
    );

    if (!template) {
      throw new ToolExecutionFailedError({
        toolName,
        message: `System template "${templateName}" not found`,
        exposeToLLM: true,
      });
    }

    return template.instructions;
  }

  private async activateCollectiveSkill(
    skillName: string,
    ownerType: 'team' | 'org',
    threadId: UUID,
  ): Promise<string> {
    const skill = await this.findActiveCollectiveSkillByName.execute(
      new FindActiveCollectiveSkillByNameQuery(skillName, ownerType),
    );
    return this.activateOnThread(skill.id, threadId);
  }

  private async activateUserSkill(
    toolName: string,
    skillName: string,
    threadId: UUID,
  ): Promise<string> {
    // findSkillByNameUseCase throws SkillNotFoundError if missing
    const skill = await this.findSkillByNameUseCase.execute(
      new FindSkillByNameQuery(skillName),
    );
    return this.activateOnThread(skill.id, threadId);
  }

  private async activateOnThread(
    skillId: UUID,
    threadId: UUID,
  ): Promise<string> {
    const threadResult = await this.findThreadUseCase.execute(
      new FindThreadQuery(threadId),
    );
    const { instructions } = await this.skillActivationService.activateOnThread(
      skillId,
      threadResult.thread,
    );
    return instructions;
  }
}
