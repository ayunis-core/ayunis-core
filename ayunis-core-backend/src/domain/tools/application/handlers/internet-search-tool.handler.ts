import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(InternetSearchToolHandler.name);

  constructor(private readonly searchWebUseCase: SearchWebUseCase) {
    super();
  }

  async execute(params: {
    tool: InternetSearchTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.log('execute', tool, input);
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
      this.logger.error('execute', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }
}
