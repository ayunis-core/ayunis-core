import { Injectable, Logger } from '@nestjs/common';
import { RetrieveUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.use-case';
import { RetrieveUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.command';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { WebsiteContentTool } from '../../domain/tools/website-content-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';

@Injectable()
export class WebsiteContentToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(WebsiteContentToolHandler.name);

  constructor(private readonly retrieveUrlUseCase: RetrieveUrlUseCase) {
    super();
  }

  async execute(params: {
    tool: WebsiteContentTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.log('execute', tool, input);
    try {
      const validatedInput = tool.validateParams(input);
      const content = await this.retrieveUrlUseCase.execute(
        new RetrieveUrlCommand(validatedInput.url),
      );
      return JSON.stringify(content);
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
