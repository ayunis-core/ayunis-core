import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

const outlookReadAttachmentToolParameters = {
  type: 'object' as const,
  properties: {
    attachmentId: {
      type: 'string' as const,
      minLength: 1,
      description:
        'The id of the attachment, exactly as returned by outlook__read_email.',
    },
    name: {
      type: 'string' as const,
      minLength: 1,
      description:
        'The file name of the attachment, for example "Antrag.pdf". Use it when you do not have the id.',
    },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

type OutlookReadAttachmentToolParameters = FromSchema<
  typeof outlookReadAttachmentToolParameters
>;

export class OutlookReadAttachmentTool extends Tool {
  constructor() {
    super({
      name: ToolType.OUTLOOK_READ_ATTACHMENT,
      description:
        'Read the text of one attachment of the email that is currently open in Outlook. Pass either attachmentId or name. Returns the extracted text, or an error when the attachment cannot be read. Nothing is changed or sent.',
      parameters: outlookReadAttachmentToolParameters,
      type: ToolType.OUTLOOK_READ_ATTACHMENT,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): OutlookReadAttachmentToolParameters {
    const validated = validateToolParams<OutlookReadAttachmentToolParameters>(
      this.parameters,
      params,
    );
    // Not expressed as a top-level anyOf: providers reject schemas that are
    // not a plain object at the root.
    if (!validated.attachmentId && !validated.name) {
      throw new Error(
        "Invalid parameters: pass either 'attachmentId' or 'name' of the attachment",
      );
    }
    return validated;
  }

  get returnsPii(): boolean {
    return true;
  }
}
