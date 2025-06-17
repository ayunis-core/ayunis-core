import { Injectable } from '@nestjs/common';
import { BaseExecutionHandler } from './base.handler';
import { Tool } from '../../domain/tool.entity';
import { RetrieveUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.use-case';
import { RetrieveUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.command';

@Injectable()
export class WebsiteContentToolHandler extends BaseExecutionHandler {
  constructor(private readonly retrieveUrlUseCase: RetrieveUrlUseCase) {
    super();
  }

  async execute(_: Tool, input: Record<string, unknown>): Promise<string> {
    const url = input.url as string;
    const content = await this.retrieveUrlUseCase.execute(
      new RetrieveUrlCommand(url),
    );
    return JSON.stringify(content);
  }
}
