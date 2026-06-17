import { Injectable, Logger } from '@nestjs/common';
import { ToolHandlerRegistry } from '../../tool-handler.registry';
import { ToolExecutionFailedError } from '../../tools.errors';
import { ExecuteToolCommand } from './execute-tool.command';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class ExecuteToolUseCase {
  private readonly logger = new Logger(ExecuteToolUseCase.name);

  constructor(private readonly toolHandlerRegistry: ToolHandlerRegistry) {}

  async execute(command: ExecuteToolCommand): Promise<string> {
    this.logger.log('execute', {
      toolName: command.tool.name,
      input: command.input,
      parameters: command.tool.parameters,
    });

    try {
      const handler = this.toolHandlerRegistry.getHandler(command.tool);
      return await handler.execute({
        tool: command.tool,
        input: command.input,
        context: command.context,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Unknown error', error as Error);
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
