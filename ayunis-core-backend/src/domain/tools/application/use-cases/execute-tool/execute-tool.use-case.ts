import { Injectable, Logger } from '@nestjs/common';
import { ToolHandlerRegistry } from 'src/domain/tools/application/tool-handler.registry';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { ExecuteToolCommand } from './execute-tool.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { stripDisallowedNulls } from 'src/common/util/strip-disallowed-nulls';

@Injectable()
export class ExecuteToolUseCase {
  private readonly logger = new Logger(ExecuteToolUseCase.name);

  constructor(private readonly toolHandlerRegistry: ToolHandlerRegistry) {}

  async execute(command: ExecuteToolCommand): Promise<string> {
    this.logger.log(
      {
        tool: { name: command.tool.name },
        input: command.input,
        tools: command.tool.parameters,
      },
      'execute',
    );

    try {
      const handler = this.toolHandlerRegistry.getHandler(command.tool);
      return await handler.execute({
        tool: command.tool,
        input: stripDisallowedNulls(command.input, command.tool.parameters),
        context: command.context,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error({ err: error as Error }, 'Unknown error');
      throw new ToolExecutionFailedError({
        toolName: command.tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: false,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }
}
