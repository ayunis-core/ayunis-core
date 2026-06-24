import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { DisplayableTool } from '../displayable-tool.entity';

const sendEmailToolParameters = {
  type: 'object' as const,
  properties: {
    subject: {
      type: 'string' as const,
      description: 'The subject of the email as plain text (no Markdown).',
    },
    body: {
      type: 'string' as const,
      description:
        'The body of the email as PLAIN TEXT only. Do NOT use Markdown formatting (no **bold**, _italics_, # headings, - bullet lists, [links](url), etc.). The widget renders the value verbatim, so any Markdown syntax would appear literally to the recipient. Use blank lines and plain punctuation for structure.',
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
        'Display an email composition widget. The user reviews and controls the final send action. Subject and body must be PLAIN TEXT only — do not use Markdown formatting; the widget renders the values verbatim and Markdown syntax would appear literally to the recipient.',
      parameters: sendEmailToolParameters,
      type: ToolType.SEND_EMAIL,
    });
  }

  validateParams(params: Record<string, unknown>): SendEmailToolParameters {
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
