import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { validateToolParams } from 'src/common/validators/tool-params.validator';

const getMemoryToolParameters = {
  type: 'object' as const,
  properties: {
    key: {
      type: 'string' as const,
      description:
        'The memory key to read, as listed in the memory section of the system prompt.',
    },
  },
  additionalProperties: false,
  required: ['key'],
} as const satisfies JSONSchema;

type GetMemoryToolParameters = FromSchema<typeof getMemoryToolParameters>;

export class GetMemoryTool extends Tool {
  constructor() {
    super({
      name: ToolType.GET_MEMORY,
      description: 'Read the full content of one memory entry.',
      descriptionLong:
        'The memory section of the system prompt already contains the full content of "personal" and ' +
        '"preferences"; never call get_memory for those. Use it for the other keys, which are listed by ' +
        'name only, when one of them looks relevant to the current task. Reading a key that does not ' +
        'exist is harmless: the result tells you which keys exist.',
      parameters: getMemoryToolParameters,
      type: ToolType.GET_MEMORY,
    });
  }

  validateParams(params: Record<string, unknown>): GetMemoryToolParameters {
    return validateToolParams<GetMemoryToolParameters>(this.parameters, params);
  }

  // Memory is the user's own data, written back into their own conversation.
  get returnsPii(): boolean {
    return true;
  }
}
