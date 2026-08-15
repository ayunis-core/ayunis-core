import { validateToolParams } from 'src/common/validators/tool-params.validator';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from '../tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';

const createCalendarEventParameters = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      description: 'The title of the event',
    },
    description: {
      type: 'string' as const,
      description: 'The description/details of the event',
    },
    location: {
      type: 'string' as const,
      description: 'The location of the event',
    },
    start: {
      type: 'string' as const,
      description: 'Event start in ISO 8601 format',
    },
    end: {
      type: 'string' as const,
      description: 'Event end in ISO 8601 format',
    },
  },
  required: ['title', 'description', 'location', 'start', 'end'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type CreateCalendarEventParameters = FromSchema<
  typeof createCalendarEventParameters
>;

export class CreateCalendarEventTool extends Tool {
  constructor() {
    super({
      name: ToolType.CREATE_CALENDAR_EVENT,
      description:
        'Display a calendar event creation widget. The user reviews and adds to their calendar. start and end must be valid ISO 8601 date-times (e.g. 2025-01-31T14:30:00Z), and end must be after start.',
      parameters: createCalendarEventParameters,
      type: ToolType.CREATE_CALENDAR_EVENT,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): CreateCalendarEventParameters {
    const validated = validateToolParams<CreateCalendarEventParameters>(
      this.parameters,
      params,
    );
    assertValidEventDates(validated.start, validated.end);
    return validated;
  }

  get returnsPii(): boolean {
    return false;
  }
}

// The dates cannot be checked in the JSON schema: `format: 'date-time'` is
// rejected by strict-mode providers (the schema is sent to them verbatim),
// and `end > start` is a cross-field constraint. An unparseable date used to
// reach the client unvalidated and crash the widget render (AYC-675).
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
