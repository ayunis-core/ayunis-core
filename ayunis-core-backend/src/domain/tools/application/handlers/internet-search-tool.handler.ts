import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SearchWebUseCase } from 'src/domain/retrievers/internet-search-retrievers/application/use-cases/search-web/search-web.use-case';
import { SearchWebCommand } from 'src/domain/retrievers/internet-search-retrievers/application/use-cases/search-web/search-web.command';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { InternetSearchTool } from '../../domain/tools/internet-search-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';

@Injectable()
export class InternetSearchToolHandler extends ToolExecutionHandler {
  constructor(
    @InjectPinoLogger(InternetSearchToolHandler.name)
    private readonly logger: PinoLogger,
    private readonly searchWebUseCase: SearchWebUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: InternetSearchTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.info({ name: tool.name, input: input }, 'execute');
    try {
      const validatedInput = tool.validateParams(input);
      const results = await this.searchWebUseCase.execute(
        new SearchWebCommand(validatedInput.query),
      );
      return JSON.stringify(results);
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
}
