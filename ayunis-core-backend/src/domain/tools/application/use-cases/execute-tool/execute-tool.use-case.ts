import { Injectable, Logger } from '@nestjs/common';
import Ajv from 'ajv';
import { ToolHandlerRegistry } from '../../tool-handler.registry';
import {
  ToolExecutionFailedError,
  ToolInvalidInputError,
} from '../../tools.errors';
import { ExecuteToolCommand } from './execute-tool.command';

@Injectable()
export class ExecuteToolUseCase {
  private readonly logger = new Logger(ExecuteToolUseCase.name);

  constructor(private readonly toolHandlerRegistry: ToolHandlerRegistry) {}

  async execute(command: ExecuteToolCommand): Promise<string> {
    this.logger.log('execute', command.tool.name, command.input);

    // Validate the input against the tool's parameters schema
    const ajv = new Ajv();
    const validate = ajv.compile(command.tool.parameters);
    if (!validate(command.input)) {
      throw new ToolInvalidInputError({
        toolName: command.tool.name,
        metadata: {
          errors: validate.errors,
        },
      });
    }

    try {
      const handler = this.toolHandlerRegistry.getHandler(command.tool);
      return await handler.execute(command.tool, command.input);
    } catch (e) {
      if (e instanceof ToolInvalidInputError) {
        throw e;
      }
      throw new ToolExecutionFailedError({
        toolName: command.tool.name,
        message: e.message,
        exposeToLLM: false,
        metadata: {
          error: e.message,
        },
      });
    }
  }
}
