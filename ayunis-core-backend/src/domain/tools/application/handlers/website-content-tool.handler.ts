import { Injectable } from '@nestjs/common';
import { RetrieveUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.use-case';
import { RetrieveUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.command';
import { ToolExecutionHandler } from '../ports/execution.handler';
import { WebsiteContentTool } from '../../domain/tools/website-content-tool.entity';
import { UUID } from 'crypto';

@Injectable()
export class WebsiteContentToolHandler extends ToolExecutionHandler {
  constructor(private readonly retrieveUrlUseCase: RetrieveUrlUseCase) {
    super();
  }

  async execute(params: {
    tool: WebsiteContentTool;
    input: Record<string, unknown>;
    orgId: UUID;
  }): Promise<string> {
    const { input } = params;
    const url = input.url as string;
    const content = await this.retrieveUrlUseCase.execute(
      new RetrieveUrlCommand(url),
    );
    return JSON.stringify(content);
  }
}
