import { Injectable, Logger } from '@nestjs/common';
import { BaseExecutionHandler } from './base.handler';
import { ToolExecutionFailedError } from '../tools.errors';
import { HttpTool, HttpToolMethod } from '../../domain/tools/http-tool.entity';

@Injectable()
export class HttpToolHandler extends BaseExecutionHandler {
  private readonly logger = new Logger(HttpToolHandler.name);

  async execute(
    tool: HttpTool,
    input: Record<string, unknown>,
  ): Promise<string> {
    this.logger.log('execute', tool, input);
    try {
      const validatedInput = tool.validateParams(input);
      const requestInput = JSON.parse(validatedInput.bodyOrQueryParams);
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
            queryParams.append(key, String(value));
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

      const data = await response.json();
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
