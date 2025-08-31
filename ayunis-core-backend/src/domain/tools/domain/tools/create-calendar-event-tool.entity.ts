import Ajv from 'ajv';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
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
  constructor() {
    super({
      name: ToolType.CREATE_CALENDAR_EVENT,
      description:
        'Display a widget for the user to create a calendar event and open a calendar link.',
      parameters: createCalendarEventParameters,
      type: ToolType.CREATE_CALENDAR_EVENT,
    });
  }

  validateParams(params: Record<string, any>): CreateCalendarEventParameters {
    const ajv = new Ajv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }

    return params as CreateCalendarEventParameters;
  }
}
