import { Injectable, Logger } from '@nestjs/common';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import {
  HttpTool,
  HttpToolMethod,
} from 'src/domain/tools/domain/tools/http-tool.entity';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';

@Injectable()
export class HttpToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(HttpToolHandler.name);

  constructor() {
    super();
  }

  async execute(params: {
    tool: HttpTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.log({ name: tool.name, input: input }, 'execute');
    try {
      const validatedInput = tool.validateParams(input);
      const requestInput = JSON.parse(
        validatedInput.bodyOrQueryParams,
      ) as Record<string, unknown>;
      const response = await this.fetchResponse(tool, requestInput);

      const data = (await response.json()) as Record<string, unknown>;
      return JSON.stringify(data);
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error({ err: error }, 'execute');
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

  private async fetchResponse(
    tool: HttpTool,
    input: Record<string, unknown>,
  ): Promise<Response> {
    const options: RequestInit = {
      method: tool.config.method,
      headers: { 'Content-Type': 'application/json' },
      ...(tool.config.method === HttpToolMethod.POST && {
        body: JSON.stringify(input),
      }),
    };
    try {
      return await fetch(this.buildUrl(tool, input), options);
    } catch {
      this.logger.warn(
        { error: 'Request to the given endpoint failed' },
        'execute',
      );
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: 'Request to the given endpoint failed',
        exposeToLLM: true,
      });
    }
  }

  private buildUrl(tool: HttpTool, input: Record<string, unknown>): string {
    if (tool.config.method !== HttpToolMethod.GET) {
      return tool.config.endpointUrl;
    }
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value as string);
      }
    }
    const query = queryParams.toString();
    return query
      ? `${tool.config.endpointUrl}?${query}`
      : tool.config.endpointUrl;
  }
}
