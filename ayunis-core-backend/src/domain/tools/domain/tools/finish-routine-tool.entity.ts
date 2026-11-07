import type { JSONSchema } from 'json-schema-to-ts';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { Tool } from 'src/domain/tools/domain/tool.entity';

const finishRoutineToolParameters = {
  type: 'object' as const,
  properties: {},
} as const satisfies JSONSchema;

/**
 * Ends an unattended routine run. It has no executor: the run stops after the
 * call, which is the only way a routine run completes successfully.
 */
export class FinishRoutineTool extends Tool {
  constructor() {
    super({
      name: ToolType.FINISH_ROUTINE,
      description:
        'End this routine run. Call it once, after you have finished the task with your other tools, or when the task cannot be done. The run only ends when you call this tool.',
      parameters: finishRoutineToolParameters,
      type: ToolType.FINISH_ROUTINE,
    });
  }

  // Arguments are ignored rather than rejected: a rejected call would keep a
  // finished routine running and cost another model turn.
  validateParams(): Record<string, never> {
    return {};
  }

  get returnsPii(): boolean {
    return false;
  }
}
