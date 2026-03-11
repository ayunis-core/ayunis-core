import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { DisplayableTool } from '../displayable-tool.entity';

const editDocumentToolParameters = {
  type: 'object' as const,
  properties: {
    artifact_id: {
      type: 'string' as const,
      description: 'The UUID of the existing artifact (document) to edit',
    },
    edits: {
      type: 'array' as const,
      description: 'Array of search-and-replace edits to apply sequentially',
      items: {
        type: 'object' as const,
        properties: {
          old_text: {
            type: 'string' as const,
            minLength: 1,
            description:
              'The exact text to find in the document. Must match exactly one location.',
          },
          new_text: {
            type: 'string' as const,
            description: 'The replacement text',
          },
        },
        required: ['old_text', 'new_text'],
        additionalProperties: false,
      },
      minItems: 1,
      maxItems: 50,
    },
  },
  required: ['artifact_id', 'edits'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type EditDocumentToolParameters = FromSchema<typeof editDocumentToolParameters>;

export class EditDocumentTool extends DisplayableTool {
  override isExecutable: boolean = true;

  constructor() {
    super({
      name: ToolType.EDIT_DOCUMENT,
      description:
        'Apply targeted edits to an existing document using search-and-replace operations. Use this for small, surgical changes like fixing typos, updating a section, or inserting text.',
      descriptionLong:
        'Use edit_document for targeted changes to existing documents: fixing typos, updating specific sections, inserting paragraphs, or making other small edits. ' +
        'This tool applies search-and-replace edits sequentially to the current document content. ' +
        'Each old_text must match exactly one location in the document - include enough surrounding context to make it unambiguous. ' +
        'The old_text must match the exact HTML source (tags, whitespace, etc.). ' +
        'For full rewrites or major restructuring, use update_document instead.',
      parameters: editDocumentToolParameters,
      type: ToolType.EDIT_DOCUMENT,
    });
  }

  validateParams(params: Record<string, unknown>): EditDocumentToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as EditDocumentToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}
