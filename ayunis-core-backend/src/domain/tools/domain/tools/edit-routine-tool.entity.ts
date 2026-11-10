import type { JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

function buildParameters(routineSummaries: Map<string, string>): JSONSchema {
  const routineIdProperty: Record<string, unknown> = {
    type: 'string' as const,
    description: `The ID of the routine to edit. The user's routines: ${[
      ...routineSummaries,
    ]
      .map(([id, summary]) => `${id} = ${summary}`)
      .join('; ')}`,
  };
  if (routineSummaries.size > 0) {
    routineIdProperty.enum = [...routineSummaries.keys()];
  }

  return {
    type: 'object' as const,
    properties: {
      routine_id: routineIdProperty,
      name: {
        type: 'string' as const,
        description:
          'The updated name of the routine. Pass an empty string if unchanged.',
      },
      prompt: {
        type: 'string' as const,
        description:
          'The updated task the routine carries out on every run, as self-contained instructions. Pass an empty string if unchanged.',
      },
      daily_time: {
        type: 'string' as const,
        pattern: '^(([01]\\d|2[0-3]):[0-5]\\d)?$',
        description:
          'The updated time of day the routine runs, as HH:mm in 24-hour German time (Europe/Berlin). Pass an empty string if unchanged.',
      },
      internet_enabled: {
        type: 'boolean' as const,
        description:
          'Whether the routine may search and read the web. Pass its current setting if unchanged.',
      },
      change_summary: {
        type: 'string' as const,
        description:
          'A brief summary of what was changed and why, shown to the user for review',
      },
    },
    required: [
      'routine_id',
      'name',
      'prompt',
      'daily_time',
      'internet_enabled',
      'change_summary',
    ],
    additionalProperties: false,
  } as const satisfies JSONSchema;
}

interface EditRoutineToolParameters {
  routine_id: string;
  name: string;
  prompt: string;
  daily_time: string;
  internet_enabled: boolean;
  change_summary: string;
}

export class EditRoutineTool extends Tool {
  /** @param routineSummaries Routine ID → a one-line summary for the model. */
  constructor(routineSummaries = new Map<string, string>()) {
    super({
      name: ToolType.EDIT_ROUTINE,
      description:
        "Display a routine edit widget. Use this when the user asks you to change one of their routines, such as its task, its daily time or its internet access, or when a routine's results show that its task should be adjusted. Provide the routine_id and the updated fields. For text fields that are not changing, pass an empty string. Include a brief change_summary describing what was modified. The user reviews and confirms the update.",
      parameters: buildParameters(routineSummaries),
      type: ToolType.EDIT_ROUTINE,
    });
  }

  validateParams(params: Record<string, unknown>): EditRoutineToolParameters {
    return validateToolParams<EditRoutineToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
