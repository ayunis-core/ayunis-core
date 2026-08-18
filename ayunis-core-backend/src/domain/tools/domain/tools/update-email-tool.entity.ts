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

const updateEmailToolParameters = {
  type: 'object' as const,
  properties: {
    artifact_id: {
      type: 'string' as const,
      description: 'The email artifact UUID',
    },
    subject: {
      type: 'string' as const,
      description: 'The complete email subject',
    },
    to: {
      type: 'array' as const,
      items: emailRecipientSchema,
    },
    cc: {
      type: 'array' as const,
      items: emailRecipientSchema,
    },
    bcc: {
      type: 'array' as const,
      items: emailRecipientSchema,
    },
    body: {
      type: 'string' as const,
      description: 'The complete plain-text email body',
    },
    expected_version: {
      type: 'integer' as const,
      description: 'The version last read by the model',
    },
  },
  required: [
    'artifact_id',
    'subject',
    'to',
    'cc',
    'bcc',
    'body',
    'expected_version',
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;

type UpdateEmailToolParameters = FromSchema<typeof updateEmailToolParameters>;

export class UpdateEmailTool extends Tool {
  constructor() {
    super({
      name: ToolType.UPDATE_EMAIL,
      description:
        'Replace an existing email draft with updated recipients, subject, and plain-text body.',
      descriptionLong:
        'Use update_email only for an email artifact already created in this conversation. Always provide the complete email and expected_version from the latest read or create result. The user must still explicitly confirm before delivery.',
      parameters: updateEmailToolParameters,
      type: ToolType.UPDATE_EMAIL,
    });
  }

  validateParams(params: Record<string, unknown>): UpdateEmailToolParameters {
    return validateToolParams<UpdateEmailToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
