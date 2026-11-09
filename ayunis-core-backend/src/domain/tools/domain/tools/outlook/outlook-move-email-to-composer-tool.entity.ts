import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { OUTLOOK_EMAIL_BODY_PROPERTY } from './outlook-email-body';

const outlookMoveEmailToComposerToolParameters = {
  type: 'object' as const,
  properties: {
    body: OUTLOOK_EMAIL_BODY_PROPERTY,
  },
  required: ['body'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type OutlookMoveEmailToComposerToolParameters = FromSchema<
  typeof outlookMoveEmailToComposerToolParameters
>;

export class OutlookMoveEmailToComposerTool extends Tool {
  constructor() {
    super({
      name: ToolType.OUTLOOK_MOVE_EMAIL_TO_COMPOSER,
      description:
        'Replace the whole body of the email the user is writing in Outlook with this text, for example once they approved a revised version from the chat. While they read an email, a reply with this text is opened instead. Nothing is sent: the user finishes and sends it in Outlook. The body must be PLAIN TEXT only.',
      parameters: outlookMoveEmailToComposerToolParameters,
      type: ToolType.OUTLOOK_MOVE_EMAIL_TO_COMPOSER,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): OutlookMoveEmailToComposerToolParameters {
    return validateToolParams<OutlookMoveEmailToComposerToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
