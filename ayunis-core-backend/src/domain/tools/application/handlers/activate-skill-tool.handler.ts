import { Injectable, Logger } from '@nestjs/common';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { ActivateSkillTool } from '../../domain/tools/activate-skill-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';
import { FindSkillByNameUseCase } from 'src/domain/skills/application/use-cases/find-skill-by-name/find-skill-by-name.use-case';
import { FindSkillByNameQuery } from 'src/domain/skills/application/use-cases/find-skill-by-name/find-skill-by-name.query';
import { AddSourceToThreadUseCase } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source-to-thread.use-case';
import { AddSourceCommand } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source.command';
import { AddMcpIntegrationToThreadUseCase } from 'src/domain/threads/application/use-cases/add-mcp-integration-to-thread/add-mcp-integration-to-thread.use-case';
import { AddMcpIntegrationToThreadCommand } from 'src/domain/threads/application/use-cases/add-mcp-integration-to-thread/add-mcp-integration-to-thread.command';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { GetSourcesByIdsQuery } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.query';

@Injectable()
export class ActivateSkillToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(ActivateSkillToolHandler.name);

  constructor(
    private readonly findSkillByNameUseCase: FindSkillByNameUseCase,
    private readonly addSourceToThreadUseCase: AddSourceToThreadUseCase,
    private readonly addMcpIntegrationToThreadUseCase: AddMcpIntegrationToThreadUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly getSourcesByIdsUseCase: GetSourcesByIdsUseCase,
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

      // Get the sources by IDs
      const sources = await this.getSourcesByIdsUseCase.execute(
        new GetSourcesByIdsQuery(skill.sourceIds),
      );

      // Copy skill's sources to the thread
      for (const source of sources) {
        await this.addSourceToThreadUseCase.execute(
          new AddSourceCommand(threadResult.thread, source, skill.id),
        );
      }

      // Copy skill's MCP integrations to the thread
      for (const mcpIntegrationId of skill.mcpIntegrationIds) {
        await this.addMcpIntegrationToThreadUseCase.execute(
          new AddMcpIntegrationToThreadCommand(threadId, mcpIntegrationId),
        );
      }

      // Return the skill's instructions
      return skill.instructions;
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
