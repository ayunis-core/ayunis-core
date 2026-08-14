import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ToolHandlerRegistry } from '../../tool-handler.registry';
import { ToolExecutionFailedError } from '../../tools.errors';
import { ExecuteToolCommand } from './execute-tool.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { stripDisallowedNulls } from 'src/common/util/strip-disallowed-nulls';

@Injectable()
export class ExecuteToolUseCase {
  constructor(
    @InjectPinoLogger(ExecuteToolUseCase.name)
    private readonly logger: PinoLogger,
    private readonly toolHandlerRegistry: ToolHandlerRegistry,
  ) {}

  async execute(command: ExecuteToolCommand): Promise<string> {
    this.logger.info(
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
