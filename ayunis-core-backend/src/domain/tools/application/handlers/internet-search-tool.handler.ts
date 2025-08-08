import { Injectable } from '@nestjs/common';
import { SearchWebUseCase } from 'src/domain/retrievers/internet-search-retrievers/application/use-cases/search-web/search-web.use-case';
import { SearchWebCommand } from 'src/domain/retrievers/internet-search-retrievers/application/use-cases/search-web/search-web.command';
import { ToolExecutionHandler } from '../ports/execution.handler';
import { UUID } from 'crypto';
import { InternetSearchTool } from '../../domain/tools/internet-search-tool.entity';

@Injectable()
export class InternetSearchToolHandler extends ToolExecutionHandler {
  constructor(private readonly searchWebUseCase: SearchWebUseCase) {
    super();
  }

  async execute(params: {
    tool: InternetSearchTool;
    input: Record<string, unknown>;
    orgId: UUID;
  }): Promise<string> {
    const { input } = params;
    const query = input.query as string;
    const results = await this.searchWebUseCase.execute(
      new SearchWebCommand(query),
    );
    return JSON.stringify(results);
  }
}
