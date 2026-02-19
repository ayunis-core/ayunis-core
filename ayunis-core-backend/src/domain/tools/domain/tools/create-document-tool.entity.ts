import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { DisplayableTool } from '../displayable-tool.entity';

const createDocumentToolParameters = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      description: 'The title of the document to create',
    },
    content: {
      type: 'string' as const,
      description:
        'The full HTML content of the document. Use semantic HTML tags (h1, h2, p, ul, ol, li, strong, em, etc.)',
    },
  },
  required: ['title', 'content'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type CreateDocumentToolParameters = FromSchema<
  typeof createDocumentToolParameters
>;

export class CreateDocumentTool extends DisplayableTool {
  override isExecutable: boolean = true;

  constructor() {
    super({
      name: ToolType.CREATE_DOCUMENT,
      description:
        'Create a new document that the user can view and edit in a WYSIWYG editor. Use this when the user asks you to write, draft, or create a document, report, letter, or any structured text content.',
      parameters: createDocumentToolParameters,
      type: ToolType.CREATE_DOCUMENT,
    });
  }

  validateParams(params: Record<string, any>): CreateDocumentToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as CreateDocumentToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}
