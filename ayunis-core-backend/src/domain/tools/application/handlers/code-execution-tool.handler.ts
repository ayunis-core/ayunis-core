import { CodeExecutionTool } from '../../domain/tools/code-execution-tool.entity';
import { ToolExecutionHandler } from '../ports/execution.handler';
import { UUID } from 'crypto';
import { ToolExecutionFailedError } from '../tools.errors';
import { getAyunisCodeExecutionService } from '../../../../common/clients/code-execution/generated/ayunisCodeExecutionService';
import type { ExecutionRequest } from '../../../../common/clients/code-execution/generated/ayunisCodeExecutionService.schemas';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CodeExecutionToolHandler extends ToolExecutionHandler {
  constructor() {
    super();
  }

  async execute(params: {
    tool: CodeExecutionTool;
    input: Record<string, unknown>;
    orgId: UUID;
  }): Promise<string> {
    const { tool, input } = params;
    const { code, files } = input;
    console.log('files', files);

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

      // Prepare the execution request
      const executionRequest: ExecutionRequest = {
        code: code as string,
        // TODO: Add files if provided
        files: {},
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
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: `Code execution service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        exposeToLLM: true,
      });
    }
  }
}
