import { validateToolParams } from 'src/common/validators/tool-params.validator';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from '../tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';

const readEmailToolParameters = {
  type: 'object' as const,
  properties: {
    artifact_id: {
      type: 'string' as const,
      description: 'The email artifact UUID',
    },
  },
  required: ['artifact_id'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type ReadEmailToolParameters = FromSchema<typeof readEmailToolParameters>;

export class ReadEmailTool extends Tool {
  constructor() {
    super({
      name: ToolType.READ_EMAIL,
      description:
        'Read the latest version of an existing email artifact before editing or delivering it.',
      parameters: readEmailToolParameters,
      type: ToolType.READ_EMAIL,
    });
  }

  validateParams(params: Record<string, unknown>): ReadEmailToolParameters {
    return validateToolParams<ReadEmailToolParameters>(this.parameters, params);
  }

  get returnsPii(): boolean {
    return false;
  }
}
