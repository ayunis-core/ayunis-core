import { CodeExecutionTool } from 'src/domain/tools/domain/tools/code-execution-tool.entity';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { UUID } from 'crypto';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { getAyunisCodeExecutionService } from 'src/common/clients/code-execution/generated/ayunisCodeExecutionService';
import type {
  ExecutionRequest,
  ExecutionResponse,
} from 'src/common/clients/code-execution/generated/ayunisCodeExecutionService.schemas';
import { Injectable, Logger } from '@nestjs/common';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { convertCSVToString, parseCSV } from 'src/common/util/csv';
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { AddSourceToThreadUseCase } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source-to-thread.use-case';
import { AddSourceCommand } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source.command';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { AuthorizedCsvSourceResolverService } from 'src/domain/tools/application/services/authorized-csv-source-resolver.service';

@Injectable()
export class CodeExecutionToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(CodeExecutionToolHandler.name);

  constructor(
    private readonly authorizedCsvSourceResolver: AuthorizedCsvSourceResolverService,
    private readonly createDataSourceUseCase: CreateDataSourceUseCase,
    private readonly addSourceToThreadUseCase: AddSourceToThreadUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: CodeExecutionTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;

    try {
      const { code, dataSourceIds } = tool.validateParams(input);

      const executionFiles = await this.prepareExecutionFiles(
        dataSourceIds,
        context.threadId,
        tool.name,
      );

      const codeExecutionService = getAyunisCodeExecutionService();
      const executionRequest: ExecutionRequest = {
        code,
        files: executionFiles,
      };
      const response =
        await codeExecutionService.executeCodeExecutePost(executionRequest);

      const createdSources = await this.processOutputFiles(
        response.output_files,
        context.threadId,
      );

      return this.formatLLMResponse(response, createdSources);
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: `Code execution service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        exposeToLLM: true,
      });
    }
  }

  private async prepareExecutionFiles(
    dataSourceIds: unknown,
    threadId: UUID,
    toolName: string,
  ): Promise<Record<string, string>> {
    const executionFiles: Record<string, string> = {};
    if (!Array.isArray(dataSourceIds)) {
      return executionFiles;
    }

    const csvSources = await this.resolveAuthorizedCsvSources(
      dataSourceIds as string[],
      threadId,
      toolName,
    );
    for (const csvSource of csvSources) {
      const sourceId = csvSource.id;
      executionFiles[`${sourceId}.csv`] = this.encodeCsvToBase64(
        csvSource,
        sourceId,
        toolName,
      );
    }
    return executionFiles;
  }

  private async resolveAuthorizedCsvSources(
    sourceIds: string[],
    threadId: UUID,
    toolName: string,
  ): Promise<CSVDataSource[]> {
    try {
      return await this.authorizedCsvSourceResolver.resolve({
        threadId,
        sourceIds,
      });
    } catch (error) {
      throw new ToolExecutionFailedError({
        toolName,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }

  private encodeCsvToBase64(
    csvSource: CSVDataSource,
    sourceId: UUID,
    toolName: string,
  ): string {
    try {
      const csvContent = convertCSVToString(csvSource.data);
      return Buffer.from(csvContent).toString('base64');
    } catch (error) {
      this.logger.error(
        {
          err: error,
          sourceId,
          rowCount: csvSource.data.rows.length,
          headerCount: csvSource.data.headers.length,
        },
        'Error converting CSV data source to string',
      );
      throw new ToolExecutionFailedError({
        toolName,
        message: `Error converting CSV data source to string: ${error instanceof Error ? error.message : 'Unknown error'}`,
        exposeToLLM: true,
      });
    }
  }

  private async processOutputFiles(
    outputFiles: ExecutionResponse['output_files'],
    threadId: UUID,
  ): Promise<string[]> {
    const createdSources: string[] = [];
    if (!outputFiles || Object.keys(outputFiles).length === 0) {
      return createdSources;
    }

    try {
      const { thread } = await this.findThreadUseCase.execute(
        new FindThreadQuery(threadId),
      );

      for (const [filename, content_b64] of Object.entries(outputFiles)) {
        const summary = await this.persistOutputFile(
          filename,
          content_b64,
          thread,
          threadId,
        );
        if (summary) {
          createdSources.push(summary);
        }
      }
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to handle output files');
    }

    return createdSources;
  }

  private async persistOutputFile(
    filename: string,
    contentBase64: string,
    thread: Parameters<AddSourceToThreadUseCase['execute']>[0]['thread'],
    threadId: UUID,
  ): Promise<string | null> {
    try {
      const csvContent = Buffer.from(contentBase64, 'base64').toString('utf-8');
      const { headers, data } = parseCSV(csvContent);
      const sourceName = filename.replace('.csv', '');

      const source = await this.createDataSourceUseCase.execute(
        new CreateCSVDataSourceCommand({
          name: sourceName,
          data: { headers, rows: data },
          createdBy: SourceCreator.LLM,
        }),
      );

      await this.addSourceToThreadUseCase.execute(
        new AddSourceCommand(thread, source),
      );

      this.logger.log(
        { sourceId: source.id, threadId, name: sourceName },
        'Created and attached CSV source',
      );

      return `${sourceName} (ID: ${source.id})`;
    } catch (error) {
      this.logger.error(
        { err: error, fileName: filename },
        'Failed to process output file',
      );
      return null;
    }
  }

  private formatLLMResponse(
    response: ExecutionResponse,
    createdSources: string[],
  ): string {
    if (!response.success) {
      return `Code execution failed (ID: ${response.execution_id})\nError: ${response.error}\nExit code: ${response.exit_code}`;
    }

    const lines: string[] = [
      `Code executed successfully (ID: ${response.execution_id})`,
    ];
    if (response.output) {
      lines.push(`Output:\n${response.output}`);
    }
    if (createdSources.length > 0) {
      const sourceList = createdSources.map((s) => `- ${s}`).join('\n');
      lines.push(
        `\nCreated ${createdSources.length} CSV data source(s):\n${sourceList}`,
      );
      lines.push(
        'These sources are now available for analysis in this conversation.',
      );
    }
    if (response.error) {
      lines.push(`Warnings/Errors:\n${response.error}`);
    }
    lines.push(`Exit code: ${response.exit_code}`);
    return lines.join('\n');
  }
}
