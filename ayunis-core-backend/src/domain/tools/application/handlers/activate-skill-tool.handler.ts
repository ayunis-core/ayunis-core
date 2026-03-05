import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { ActivateSkillTool } from '../../domain/tools/activate-skill-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';
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
} from 'src/common/util/skill-slug';

@Injectable()
export class ActivateSkillToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(ActivateSkillToolHandler.name);

  constructor(
    private readonly findSkillByNameUseCase: FindSkillByNameUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly skillActivationService: SkillActivationService,
    private readonly findAlwaysOnTemplateByNameUseCase: FindAlwaysOnTemplateByNameUseCase,
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
    this.logger.log('execute', tool, input);

    try {
      const validatedInput = tool.validateParams(input);
      const fullSlug = validatedInput.skill_slug;

      const originalName = tool.resolveOriginalName(fullSlug);
      if (!originalName) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: `Could not resolve slug "${fullSlug}" to a skill name`,
          exposeToLLM: true,
        });
      }

      const { prefix } = parseSkillSlug(fullSlug);

      switch (prefix) {
        case SYSTEM_PREFIX:
          return await this.activateSystemTemplate(tool.name, originalName);
        case USER_PREFIX:
          return await this.activateUserSkill(
            tool.name,
            originalName,
            threadId,
          );
        default: {
          const _exhaustive: never = prefix;
          throw new ToolExecutionFailedError({
            toolName: tool.name,
            message: `Unknown skill prefix: "${String(_exhaustive)}"`,
            exposeToLLM: true,
          });
        }
      }
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error('execute', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
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

  private async activateUserSkill(
    toolName: string,
    skillName: string,
    threadId: UUID,
  ): Promise<string> {
    const skill = await this.findSkillByNameUseCase.execute(
      new FindSkillByNameQuery(skillName),
    );

    if (!skill) {
      throw new ToolExecutionFailedError({
        toolName,
        message: `Skill "${skillName}" not found`,
        exposeToLLM: true,
      });
    }

    const threadResult = await this.findThreadUseCase.execute(
      new FindThreadQuery(threadId),
    );

    const { instructions } = await this.skillActivationService.activateOnThread(
      skill.id,
      threadResult.thread,
    );

    return instructions;
  }
}
