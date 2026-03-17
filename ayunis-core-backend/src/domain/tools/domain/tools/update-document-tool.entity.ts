import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { DisplayableTool } from '../displayable-tool.entity';

const updateDocumentToolParameters = {
  type: 'object' as const,
  properties: {
    artifact_id: {
      type: 'string' as const,
      description: 'The UUID of the existing artifact (document) to update',
    },
    content: {
      type: 'string' as const,
      description:
        'The full updated HTML content of the document. Provide the complete document content, not just the changes.',
    },
    expected_version: {
      type: 'integer' as const,
      description:
        'The version number you expect the document to be at. Pass the version from your last create/update/edit result, or from read_document. The operation will fail if the document has been modified since.',
    },
  },
  required: ['artifact_id', 'content', 'expected_version'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type UpdateDocumentToolParameters = FromSchema<
  typeof updateDocumentToolParameters
>;

export class UpdateDocumentTool extends DisplayableTool {
  override isExecutable: boolean = true;

  constructor() {
    super({
      name: ToolType.UPDATE_DOCUMENT,
      description:
        'Update an existing document with new content. Use this when the user asks you to modify, revise, or improve an existing document.',
      descriptionLong:
        'Use update_document when a document already exists in the conversation (was previously created with create_document). ' +
        'Use create_document instead when the user wants a brand new document. ' +
        'Always provide the full updated content, not a partial diff. ' +
        'For targeted changes (fixing typos, updating a section, inserting a paragraph), prefer edit_document instead — ' +
        'it is more efficient and less error-prone for small edits. ' +
        'You must pass expected_version with the version number from your last tool result or from read_document. ' +
        'If the document was modified by the user since then, the operation will fail — use read_document to get the current content first.',
      parameters: updateDocumentToolParameters,
      type: ToolType.UPDATE_DOCUMENT,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): UpdateDocumentToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as UpdateDocumentToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}
