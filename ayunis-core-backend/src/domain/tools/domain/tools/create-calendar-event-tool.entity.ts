import { validateToolParams } from 'src/common/validators/tool-params.validator';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { DisplayableTool } from '../displayable-tool.entity';
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

export class CreateCalendarEventTool extends DisplayableTool {
  // Runs a backend validation pass before the widget is displayed so malformed
  // dates are rejected with an actionable message the model can retry on,
  // instead of reaching the client and crashing the render (AYC-675).
  override isExecutable: boolean = true;

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
    return validateToolParams<CreateCalendarEventParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
