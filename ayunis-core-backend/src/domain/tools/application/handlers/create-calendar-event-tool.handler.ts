import { Injectable, Logger } from '@nestjs/common';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { CreateCalendarEventTool } from '../../domain/tools/create-calendar-event-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';

@Injectable()
export class CreateCalendarEventToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(CreateCalendarEventToolHandler.name);

  execute(params: {
    tool: CreateCalendarEventTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input } = params;
    this.logger.log('Executing create_calendar_event tool');

    try {
      const validated = tool.validateParams(input);
      assertValidEventDates(validated.start, validated.end);
      return Promise.resolve('Calendar event widget displayed successfully');
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        return Promise.reject(error);
      }
      return Promise.reject(
        new ToolExecutionFailedError({
          toolName: tool.name,
          message: error instanceof Error ? error.message : 'Unknown error',
          exposeToLLM: true,
        }),
      );
    }
  }
}

function assertValidEventDates(start: string, end: string): void {
  const startTime = new Date(start).getTime();
  if (Number.isNaN(startTime)) {
    throw new Error(
      `'start' must be a valid ISO 8601 date-time (e.g. 2025-01-31T14:30:00Z), received '${start}'`,
    );
  }
  const endTime = new Date(end).getTime();
  if (Number.isNaN(endTime)) {
    throw new Error(
      `'end' must be a valid ISO 8601 date-time (e.g. 2025-01-31T15:30:00Z), received '${end}'`,
    );
  }
  if (endTime <= startTime) {
    throw new Error("'end' must be after 'start'");
  }
}
