import { validateToolParams } from 'src/common/validators/tool-params.validator';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

const createRoutineToolParameters = {
  type: 'object' as const,
  properties: {
    name: {
      type: 'string' as const,
      description: 'The name of the routine',
    },
    prompt: {
      type: 'string' as const,
      description:
        'The task the routine carries out on every run, as self-contained instructions. Each run starts without this conversation, so include everything the task needs.',
    },
    daily_time: {
      type: 'string' as const,
      pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
      description:
        'The time of day the routine runs, as HH:mm in 24-hour German time (Europe/Berlin)',
    },
    internet_enabled: {
      type: 'boolean' as const,
      description:
        'Whether the routine may search and read the web. Enable it only when the task needs information from the internet.',
    },
  },
  required: ['name', 'prompt', 'daily_time', 'internet_enabled'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type CreateRoutineToolParameters = FromSchema<
  typeof createRoutineToolParameters
>;

export class CreateRoutineTool extends Tool {
  constructor() {
    super({
      name: ToolType.CREATE_ROUTINE,
      description:
        "Display a routine creation widget. A routine is a task that runs unattended once a day at a fixed time and reports anything relevant to the user's inbox. Use this when the user asks you to create a routine, or wants a task done for them regularly. Propose a name, the task, the daily time and whether the routine needs the internet, based on what the user described. The user reviews and confirms the creation.",
      parameters: createRoutineToolParameters,
      type: ToolType.CREATE_ROUTINE,
    });
  }

  validateParams(params: Record<string, unknown>): CreateRoutineToolParameters {
    return validateToolParams<CreateRoutineToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
