import { validateToolParams } from 'src/common/validators/tool-params.validator';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from '../tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';

const emailRecipientSchema = {
  anyOf: [
    { type: 'string' as const, format: 'email' as const },
    {
      type: 'string' as const,
      pattern: '^\\{\\{pii:[A-Z][A-Z0-9_]*_\\d+\\}\\}$',
    },
  ],
} as const;

const createEmailToolParameters = {
  type: 'object' as const,
  properties: {
    subject: { type: 'string' as const, description: 'The email subject' },
    to: {
      type: 'array' as const,
      items: emailRecipientSchema,
      minItems: 1,
      description: 'At least one To recipient.',
    },
    cc: {
      type: 'array' as const,
      items: emailRecipientSchema,
      description: 'Optional CC recipients',
    },
    bcc: {
      type: 'array' as const,
      items: emailRecipientSchema,
      description: 'Optional BCC recipients',
    },
    body: { type: 'string' as const, description: 'The plain-text email body' },
  },
  required: ['subject', 'to', 'body'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type CreateEmailToolParameters = FromSchema<typeof createEmailToolParameters>;

export class CreateEmailTool extends Tool {
  constructor() {
    super({
      name: ToolType.CREATE_EMAIL,
      description:
        'Create a versioned email draft the user can review and edit. Use plain text for the body. Do not send the email automatically.',
      parameters: createEmailToolParameters,
      type: ToolType.CREATE_EMAIL,
    });
  }

  validateParams(params: Record<string, unknown>): CreateEmailToolParameters {
    return validateToolParams<CreateEmailToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
