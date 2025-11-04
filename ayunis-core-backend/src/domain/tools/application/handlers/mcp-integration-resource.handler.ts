import { RetrieveMcpResourceUseCase } from 'src/domain/mcp/application/use-cases/retrieve-mcp-resource/retrieve-mcp-resource.use-case';
import { McpIntegrationResource } from '../../domain/tools/mcp-integration-resource.entity';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { RetrieveMcpResourceCommand } from 'src/domain/mcp/application/use-cases/retrieve-mcp-resource/retrieve-mcp-resource.command';
import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ToolExecutionFailedError } from '../tools.errors';
import { parseCSV } from 'src/common/util/csv';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { AddSourceCommand } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source.command';
import { AddSourceToThreadUseCase } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source-to-thread.use-case';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';

@Injectable()
export class McpIntegrationResourceHandler implements ToolExecutionHandler {
  private readonly logger = new Logger(McpIntegrationResourceHandler.name);

  constructor(
    private readonly retrieveMcpResourceUseCase: RetrieveMcpResourceUseCase,
    private readonly createDataSourceUseCase: CreateDataSourceUseCase,
    private readonly addSourceToThreadUseCase: AddSourceToThreadUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
  ) {}

  async execute(params: {
    tool: McpIntegrationResource;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.log('execute', tool, input);
    const validatedInput = tool.validateParams(input);
    try {
      const { content, mimeType } =
        await this.retrieveMcpResourceUseCase.execute(
          new RetrieveMcpResourceCommand(
            tool.integrationId,
            validatedInput.resourceUri,
          ),
        );
      const threadId = context.threadId;
      const thread = await this.findThreadUseCase.execute(
        new FindThreadQuery(threadId),
      );
      if (mimeType === 'text/csv') {
        const source = await this.createDataSourceUseCase.execute(
          new CreateCSVDataSourceCommand({
            name: `MCP Resource: ${validatedInput.resourceUri}`,
            data: {
              headers: parseCSV(content as string).headers,
              rows: parseCSV(content as string).data,
            },
            createdBy: SourceCreator.SYSTEM,
          }),
        );
        await this.addSourceToThreadUseCase.execute(
          new AddSourceCommand(thread, source),
        );
        return `CSV resource imported as data source with ID ${source.id}. You can now analyze this data through code execution.`;
      }
      return JSON.stringify(content);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('error', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message:
          error instanceof Error
            ? error.message
            : 'Unexpected error occurred while retrieving MCP resource',
        exposeToLLM: true,
      });
    }
  }
}
