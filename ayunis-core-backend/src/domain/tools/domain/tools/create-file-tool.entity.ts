import { validateToolParams } from 'src/common/validators/tool-params.validator';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

const createFileParameters = {
  type: 'object',
  properties: {
    filename: {
      type: 'string',
      maxLength: 200,
      description:
        'The filename without an extension (at most 200 characters).',
    },
    format: { type: 'string', enum: ['xml', 'json', 'txt'] },
    content: {
      type: 'string',
      maxLength: 100000,
      description:
        'The complete text content of the file, without markdown code fences.',
    },
  },
  required: ['filename', 'format', 'content'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type CreateFileParameters = FromSchema<typeof createFileParameters>;

export class CreateFileTool extends Tool {
  constructor() {
    super({
      name: ToolType.CREATE_FILE,
      description:
        'Create a downloadable XML, JSON or plain-text file. Use this instead of markdown download links. The file is displayed in chat and you can continue your answer afterwards. For Word/PDF prose documents, use create_document.',
      parameters: createFileParameters,
      type: ToolType.CREATE_FILE,
    });
  }

  validateParams(params: Record<string, unknown>): CreateFileParameters {
    return validateToolParams<CreateFileParameters>(this.parameters, params);
  }

  get returnsPii(): boolean {
    return false;
  }
}
