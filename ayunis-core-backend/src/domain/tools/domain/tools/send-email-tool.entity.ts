import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { DisplayableTool } from '../displayable-tool.entity';

const sendEmailToolParameters = {
  type: 'object' as const,
  properties: {
    subject: {
      type: 'string' as const,
      description: 'The subject of the email',
    },
    body: {
      type: 'string' as const,
      description: 'The body of the email',
    },
    to: {
      type: 'string' as const,
      description:
        'The recipients of the email. If there is no recipient, provide an empty string.',
    },
  },
  required: ['subject', 'body', 'to'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type SendEmailToolParameters = FromSchema<typeof sendEmailToolParameters>;

export class SendEmailTool extends DisplayableTool {
  constructor() {
    super({
      name: ToolType.SEND_EMAIL,
      description:
        'Display an email composition widget. The user reviews and controls the final send action.',
      parameters: sendEmailToolParameters,
      type: ToolType.SEND_EMAIL,
    });
  }

  validateParams(params: Record<string, any>): SendEmailToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as SendEmailToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}
