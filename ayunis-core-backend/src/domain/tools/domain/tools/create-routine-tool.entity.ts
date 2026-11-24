import { validateToolParams } from 'src/common/validators/tool-params.validator';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  assertValidRoutineInternetParams,
  routineAllowedDomainsParameter,
  routineInternetAccessParameter,
} from './routine-internet-params';
import {
  assertValidRoutineScheduleParams,
  routineScheduleParameter,
} from './routine-schedule-params';

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
    schedule: routineScheduleParameter,
    internet_access: routineInternetAccessParameter,
    allowed_domains: {
      ...routineAllowedDomainsParameter,
      description: `${routineAllowedDomainsParameter.description} Required with "allowlist".`,
    },
  },
  required: ['name', 'prompt', 'schedule', 'internet_access'],
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
        "Display a routine creation widget. A routine is a task that runs unattended on a schedule (daily, on chosen weekdays, or monthly, at a fixed time) and reports anything relevant to the user's inbox. Use this when the user asks you to create a routine, or wants a task done for them regularly. Propose a name, the task, the schedule and the internet access the routine needs, based on what the user described. The user reviews and confirms the creation.",
      parameters: createRoutineToolParameters,
      type: ToolType.CREATE_ROUTINE,
    });
  }

  validateParams(params: Record<string, unknown>): CreateRoutineToolParameters {
    const validated = validateToolParams<CreateRoutineToolParameters>(
      this.parameters,
      params,
    );
    assertValidRoutineScheduleParams(validated.schedule);
    assertValidRoutineInternetParams(
      validated.internet_access,
      validated.allowed_domains ?? [],
    );
    return validated;
  }

  get returnsPii(): boolean {
    return false;
  }
}
