import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { OUTLOOK_EMAIL_BODY_PROPERTY } from './outlook-email-body';

const outlookDraftEmailToolParameters = {
  type: 'object' as const,
  properties: {
    subject: {
      type: 'string' as const,
      description:
        'The subject as plain text (no Markdown). Omit it to keep the current subject.',
    },
    body: OUTLOOK_EMAIL_BODY_PROPERTY,
  },
  required: ['body'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type OutlookDraftEmailToolParameters = FromSchema<
  typeof outlookDraftEmailToolParameters
>;

export class OutlookDraftEmailTool extends Tool {
  constructor() {
    super({
      name: ToolType.OUTLOOK_DRAFT_EMAIL,
      description:
        'Put a draft into Outlook for the email that is currently open: while the user writes an email, the text is inserted at the cursor; while they read one, a reply with this text is opened. Nothing is sent: the user reviews, edits and sends it in Outlook. Subject and body must be PLAIN TEXT only.',
      parameters: outlookDraftEmailToolParameters,
      type: ToolType.OUTLOOK_DRAFT_EMAIL,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): OutlookDraftEmailToolParameters {
    return validateToolParams<OutlookDraftEmailToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
