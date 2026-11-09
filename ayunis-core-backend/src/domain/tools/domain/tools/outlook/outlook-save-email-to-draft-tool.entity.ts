import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

const outlookSaveEmailToDraftToolParameters = {
  type: 'object' as const,
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;

type OutlookSaveEmailToDraftToolParameters = FromSchema<
  typeof outlookSaveEmailToDraftToolParameters
>;

export class OutlookSaveEmailToDraftTool extends Tool {
  constructor() {
    super({
      name: ToolType.OUTLOOK_SAVE_EMAIL_TO_DRAFT,
      description:
        'Save the email the user is writing in Outlook to their Drafts folder. Only works while an email is being written, not while one is being read. Takes no parameters. Nothing is sent.',
      parameters: outlookSaveEmailToDraftToolParameters,
      type: ToolType.OUTLOOK_SAVE_EMAIL_TO_DRAFT,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): OutlookSaveEmailToDraftToolParameters {
    return validateToolParams<OutlookSaveEmailToDraftToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
