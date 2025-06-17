import { Injectable } from '@nestjs/common';
import { BaseExecutionHandler } from './base.handler';
import { Tool } from '../../domain/tool.entity';
import { SearchWebUseCase } from 'src/domain/retrievers/internet-search-retrievers/application/use-cases/search-web/search-web.use-case';
import { SearchWebCommand } from 'src/domain/retrievers/internet-search-retrievers/application/use-cases/search-web/search-web.command';

@Injectable()
export class InternetSearchToolHandler extends BaseExecutionHandler {
  constructor(private readonly searchWebUseCase: SearchWebUseCase) {
    super();
  }

  async execute(_: Tool, input: Record<string, unknown>): Promise<string> {
    const query = input.query as string;
    const results = await this.searchWebUseCase.execute(
      new SearchWebCommand(query),
    );
    return JSON.stringify(results);
  }
}
