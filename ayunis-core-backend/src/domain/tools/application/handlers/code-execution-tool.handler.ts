import { CodeExecutionTool } from '../../domain/tools/code-execution-tool.entity';
import { ToolExecutionHandler } from '../ports/execution.handler';
import { UUID } from 'crypto';
import { ToolExecutionFailedError } from '../tools.errors';
import { getAyunisCodeExecutionService } from '../../../../common/clients/code-execution/generated/ayunisCodeExecutionService';
import type { ExecutionRequest } from '../../../../common/clients/code-execution/generated/ayunisCodeExecutionService.schemas';
import { Injectable, Logger } from '@nestjs/common';
import { GetSourceByIdUseCase } from 'src/domain/sources/application/use-cases/get-source-by-id/get-source-by-id.use-case';
import { GetSourceByIdQuery } from 'src/domain/sources/application/use-cases/get-source-by-id/get-source-by-id.query';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { convertCSVToString } from 'src/common/util/csv';

@Injectable()
export class CodeExecutionToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(CodeExecutionToolHandler.name);
  constructor(private readonly getSourceByIdUseCase: GetSourceByIdUseCase) {
    super();
  }

  async execute(params: {
    tool: CodeExecutionTool;
    input: Record<string, unknown>;
    orgId: UUID;
  }): Promise<string> {
    const { tool, input } = params;
    const { code, files, dataSourceIds } = input;
    console.log('files', files);
    console.log('dataSourceIds', dataSourceIds);

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

      // Format the response for the LLM
      if (response.success) {
        let result = `Code executed successfully (ID: ${response.execution_id})\n`;
        if (response.output) {
          result += `Output:\n${response.output}\n`;
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
