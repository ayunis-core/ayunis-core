import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class ActivateSkillToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(ActivateSkillToolHandler.name);

  constructor(
    private readonly findSkillByNameUseCase: FindSkillByNameUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly skillActivationService: SkillActivationService,
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

      // Find the skill by name
      const skill = await this.findSkillByNameUseCase.execute(
        new FindSkillByNameQuery(validatedInput.skill_name),
      );

      if (!skill) {
        this.logger.error('Skill not found', validatedInput.skill_name);
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: `Skill "${validatedInput.skill_name}" not found`,
          exposeToLLM: true,
        });
      }

      // Get the thread
      const threadResult = await this.findThreadUseCase.execute(
        new FindThreadQuery(threadId),
      );

      // Delegate core activation logic to SkillActivationService
      const { instructions } =
        await this.skillActivationService.activateOnThread(
          skill.id,
          threadResult.thread,
        );

      return instructions;
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
}
