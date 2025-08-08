import { Injectable, Logger } from '@nestjs/common';
//import Ajv from 'ajv';
import { ToolHandlerRegistry } from '../../tool-handler.registry';
import {
  ToolExecutionFailedError,
  //ToolInvalidInputError,
} from '../../tools.errors';
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

    // Validate the input against the tool's parameters schema
    // const ajv = new Ajv();
    // const validate = ajv.compile(command.tool.parameters);
    // if (!validate(command.input)) {
    //   this.logger.error('Invalid input', command.input);
    //   throw new ToolInvalidInputError({
    //     toolName: command.tool.name,
    //     metadata: {
    //       errors: validate.errors,
    //     },
    //   });
    // }

    try {
      const handler = this.toolHandlerRegistry.getHandler(command.tool);
      return await handler.execute({
        tool: command.tool,
        input: command.input,
        orgId: command.orgId,
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
