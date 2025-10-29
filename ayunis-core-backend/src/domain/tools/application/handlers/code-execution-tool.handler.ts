import { CodeExecutionTool } from '../../domain/tools/code-execution-tool.entity';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { UUID } from 'crypto';
import { ToolExecutionFailedError } from '../tools.errors';
import { getAyunisCodeExecutionService } from '../../../../common/clients/code-execution/generated/ayunisCodeExecutionService';
import type { ExecutionRequest } from '../../../../common/clients/code-execution/generated/ayunisCodeExecutionService.schemas';
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
    const { code, dataSourceIds } = input;

    const isValid = tool.validateParams(input);
    if (!isValid) {
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: 'Invalid input parameters',
        exposeToLLM: true,
      });
    }

    try {
      // Get the code execution service client
      const codeExecutionService = getAyunisCodeExecutionService();

      // Prepare files object
      const executionFiles: Record<string, string> = {};

      // Add CSV data sources as files
      if (dataSourceIds && Array.isArray(dataSourceIds)) {
        for (const sourceId of dataSourceIds) {
          const csvSource = await this.getSourceByIdUseCase
            .execute(new GetSourceByIdQuery(sourceId as UUID))
            .catch((error) => {
              this.logger.error('Error getting CSV data source', error);
              throw new ToolExecutionFailedError({
                toolName: tool.name,
                message: `Error getting CSV data source: ${error instanceof Error ? error.message : 'Unknown error. Source ID: ' + sourceId}`,
                exposeToLLM: true,
              });
            });
          if (csvSource instanceof CSVDataSource) {
            try {
              const csvContent = convertCSVToString(csvSource.data);
              executionFiles[`${sourceId}.csv`] =
                Buffer.from(csvContent).toString('base64');
            } catch (error) {
              this.logger.error(
                'Error converting CSV data source to string',
                error,
                { data: csvSource.data },
              );
              throw new ToolExecutionFailedError({
                toolName: tool.name,
                message: `Error converting CSV data source to string: ${error instanceof Error ? error.message : 'Unknown error'} Source data: ${JSON.stringify(csvSource.data)}`,
                exposeToLLM: true,
              });
            }
          }
        }
      }

      // Prepare the execution request
      const executionRequest: ExecutionRequest = {
        code: code as string,
        files: executionFiles,
      };

      // Execute the code using the generated client (returns data directly via custom mutator)
      const response =
        await codeExecutionService.executeCodeExecutePost(executionRequest);

      // Handle output CSV files if present
      const createdSources: string[] = [];
      if (
        response.output_files &&
        Object.keys(response.output_files).length > 0
      ) {
        try {
          const thread = await this.findThreadUseCase.execute(
            new FindThreadQuery(context.threadId),
          );

          for (const [filename, content_b64] of Object.entries(
            response.output_files,
          )) {
            try {
              // Decode the base64 content
              const csvContent = Buffer.from(content_b64, 'base64').toString(
                'utf-8',
              );

              // Parse CSV
              const { headers, data } = parseCSV(csvContent);

              // Create data source
              const sourceName = filename.replace('.csv', '');
              const source = await this.createDataSourceUseCase.execute(
                new CreateCSVDataSourceCommand({
                  name: sourceName,
                  data: { headers, rows: data },
                  createdBy: SourceCreator.LLM,
                }),
              );

              // Add source to thread
              await this.addSourceToThreadUseCase.execute(
                new AddSourceCommand(thread, source),
              );

              createdSources.push(`${sourceName} (ID: ${source.id})`);
              this.logger.log(
                `Created and attached CSV source: ${sourceName}`,
                {
                  sourceId: source.id,
                  threadId: context.threadId,
                },
              );
            } catch (error) {
              this.logger.error(
                `Failed to process output file ${filename}`,
                error,
              );
              // Continue processing other files
            }
          }
        } catch (error) {
          this.logger.error('Failed to handle output files', error);
          // Don't fail the entire execution if source creation fails
        }
      }

      // Format the response for the LLM
      if (response.success) {
        let result = `Code executed successfully (ID: ${response.execution_id})\n`;
        if (response.output) {
          result += `Output:\n${response.output}\n`;
        }
        if (createdSources.length > 0) {
          result += `\nCreated ${createdSources.length} CSV data source(s):\n${createdSources.map((s) => `- ${s}`).join('\n')}\n`;
          result += `These sources are now available for analysis in this conversation.\n`;
        }
        if (response.error) {
          result += `Warnings/Errors:\n${response.error}\n`;
        }
        result += `Exit code: ${response.exit_code}`;
        return result;
      } else {
        return `Code execution failed (ID: ${response.execution_id})\nError: ${response.error}\nExit code: ${response.exit_code}`;
      }
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
}
