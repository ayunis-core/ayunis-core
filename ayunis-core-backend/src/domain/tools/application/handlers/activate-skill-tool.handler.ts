import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { ActivateSkillTool } from '../../domain/tools/activate-skill-tool.entity';
import { FindSkillByNameUseCase } from 'src/domain/skills/application/use-cases/find-skill-by-name/find-skill-by-name.use-case';
import { FindSkillByNameQuery } from 'src/domain/skills/application/use-cases/find-skill-by-name/find-skill-by-name.query';
import { AddSourceToThreadUseCase } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source-to-thread.use-case';
import { AddSourceCommand } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source.command';
import { AddMcpIntegrationToThreadUseCase } from 'src/domain/threads/application/use-cases/add-mcp-integration-to-thread/add-mcp-integration-to-thread.use-case';
import { AddMcpIntegrationToThreadCommand } from 'src/domain/threads/application/use-cases/add-mcp-integration-to-thread/add-mcp-integration-to-thread.command';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { GetSourcesByIdsQuery } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.query';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { ToolExecutionFailedError } from '../tools.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class ActivateSkillToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(ActivateSkillToolHandler.name);

  constructor(
    private readonly findSkillByNameUseCase: FindSkillByNameUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly addSourceToThreadUseCase: AddSourceToThreadUseCase,
    private readonly getSourcesByIdsUseCase: GetSourcesByIdsUseCase,
    private readonly addMcpIntegrationToThreadUseCase: AddMcpIntegrationToThreadUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: ActivateSkillTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;

    try {
      tool.validateParams(input);
    } catch (error) {
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: `Invalid input: ${error instanceof Error ? error.message : 'Unknown error'}`,
        exposeToLLM: true,
      });
    }

    const skillName = input.skill_name as string;
    this.logger.log('Activating skill', { skillName });

    try {
      const skill = await this.findSkillByNameUseCase.execute(
        new FindSkillByNameQuery(skillName),
      );

      await this.attachSourcesToThread(skill.sourceIds, context);
      await this.attachMcpIntegrationsToThread(
        skill.mcpIntegrationIds,
        context,
      );

      return skill.instructions;
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) throw error;
      this.logger.error('Failed to activate skill', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message:
          error instanceof ApplicationError
            ? error.message
            : `Failed to activate skill: ${skillName}`,
        exposeToLLM: true,
      });
    }
  }

  private async attachSourcesToThread(
    sourceIds: UUID[],
    context: ToolExecutionContext,
  ): Promise<void> {
    if (sourceIds.length === 0) return;

    const sources = await this.getSourcesByIdsUseCase.execute(
      new GetSourcesByIdsQuery(sourceIds),
    );

    const { thread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(context.threadId),
    );

    for (const source of sources) {
      try {
        await this.addSourceToThreadUseCase.execute(
          new AddSourceCommand(thread, source),
        );
      } catch {
        // Source may already be assigned — skip silently
        this.logger.debug('Source already assigned to thread', {
          sourceId: source.id,
          threadId: context.threadId,
        });
      }
    }
  }

  private async attachMcpIntegrationsToThread(
    mcpIntegrationIds: UUID[],
    context: ToolExecutionContext,
  ): Promise<void> {
    if (mcpIntegrationIds.length === 0) return;

    for (const integrationId of mcpIntegrationIds) {
      await this.addMcpIntegrationToThreadUseCase.execute(
        new AddMcpIntegrationToThreadCommand(context.threadId, integrationId),
      );
    }
  }
}
