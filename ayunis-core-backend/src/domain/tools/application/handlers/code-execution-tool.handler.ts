import { CodeExecutionTool } from '../../domain/tools/code-execution-tool.entity';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { UUID } from 'crypto';
import { ToolExecutionFailedError } from '../tools.errors';
import { getAyunisCodeExecutionService } from '../../../../common/clients/code-execution/generated/ayunisCodeExecutionService';
import type {
  ExecutionRequest,
  ExecutionResponse,
} from '../../../../common/clients/code-execution/generated/ayunisCodeExecutionService.schemas';
import { Injectable, Logger } from '@nestjs/common';
import { GetSourceByIdUseCase } from 'src/domain/sources/application/use-cases/get-source-by-id/get-source-by-id.use-case';
import { GetSourceByIdQuery } from 'src/domain/sources/application/use-cases/get-source-by-id/get-source-by-id.query';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { convertCSVToString, parseCSV } from 'src/common/util/csv';
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { AddSourceToThreadUseCase } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source-to-thread.use-case';
import { AddSourceCommand } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source.command';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';

@Injectable()
export class CodeExecutionToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(CodeExecutionToolHandler.name);
  constructor(
    private readonly getSourceByIdUseCase: GetSourceByIdUseCase,
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
    toolName: string,
  ): Promise<Record<string, string>> {
    const executionFiles: Record<string, string> = {};
    if (!Array.isArray(dataSourceIds)) {
      return executionFiles;
    }

    for (const sourceId of dataSourceIds) {
      const csvSource = await this.loadCsvSource(sourceId as UUID, toolName);
      if (csvSource instanceof CSVDataSource) {
        executionFiles[`${sourceId}.csv`] = this.encodeCsvToBase64(
          csvSource,
          sourceId as UUID,
          toolName,
        );
      }
    }
    return executionFiles;
  }

  private async loadCsvSource(sourceId: UUID, toolName: string) {
    try {
      return await this.getSourceByIdUseCase.execute(
        new GetSourceByIdQuery(sourceId),
      );
    } catch (error) {
      this.logger.error('Error getting CSV data source', error);
      throw new ToolExecutionFailedError({
        toolName,
        message: `Error getting CSV data source: ${error instanceof Error ? error.message : 'Unknown error. Source ID: ' + sourceId}`,
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
      this.logger.error('Error converting CSV data source to string', error, {
        sourceId,
        rowCount: csvSource.data.rows.length,
        headerCount: csvSource.data.headers.length,
      });
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
      this.logger.error('Failed to handle output files', error);
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

      this.logger.log(`Created and attached CSV source: ${sourceName}`, {
        sourceId: source.id,
        threadId,
      });

      return `${sourceName} (ID: ${source.id})`;
    } catch (error) {
      this.logger.error(`Failed to process output file ${filename}`, error);
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
