import { Injectable, Logger } from '@nestjs/common';
import { ToolExecutionFailedError } from '../tools.errors';
import { HttpTool, HttpToolMethod } from '../../domain/tools/http-tool.entity';
import { ToolExecutionHandler } from '../ports/execution.handler';
import { UUID } from 'crypto';

@Injectable()
export class HttpToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(HttpToolHandler.name);

  async execute(params: {
    tool: HttpTool;
    input: Record<string, unknown>;
    orgId: UUID;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.log('execute', tool, input);
    try {
      const validatedInput = tool.validateParams(input);
      const requestInput = JSON.parse(
        validatedInput.bodyOrQueryParams,
      ) as Record<string, unknown>;
      const options: RequestInit = {
        method: tool.config.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // Add body only for POST requests
      if (tool.config.method === HttpToolMethod.POST) {
        options.body = JSON.stringify(requestInput);
      }

      // For GET requests, append parameters to URL
      let url = tool.config.endpointUrl;
      if (
        tool.config.method === HttpToolMethod.GET &&
        Object.keys(requestInput).length > 0
      ) {
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(requestInput)) {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value as string);
          }
        }
        url = `${url}?${queryParams.toString()}`;
      }

      const response = await fetch(url, options).catch(() => {
        this.logger.warn('execute', 'Request to the given endpoint failed');
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: 'Request to the given endpoint failed',
          exposeToLLM: true,
        });
      });

      const data = (await response.json()) as Record<string, unknown>;
      return JSON.stringify(data);
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error('execute', error);
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: false,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }
}
