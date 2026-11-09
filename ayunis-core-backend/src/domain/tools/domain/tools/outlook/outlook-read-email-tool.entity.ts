import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

const outlookReadEmailToolParameters = {
  type: 'object' as const,
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;

type OutlookReadEmailToolParameters = FromSchema<
  typeof outlookReadEmailToolParameters
>;

export class OutlookReadEmailTool extends Tool {
  constructor() {
    super({
      name: ToolType.OUTLOOK_READ_EMAIL,
      description:
        'Read the email that is currently open in Outlook, whether the user is reading it or writing it: subject, sender, recipients, date, body as plain text and its attachments. Call it before you summarize, answer or improve the email. Takes no parameters. Nothing is changed or sent.',
      parameters: outlookReadEmailToolParameters,
      type: ToolType.OUTLOOK_READ_EMAIL,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): OutlookReadEmailToolParameters {
    return validateToolParams<OutlookReadEmailToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return true;
  }
}
