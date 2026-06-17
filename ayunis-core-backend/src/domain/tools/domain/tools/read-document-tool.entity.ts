import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from '../tool.entity';

const readDocumentToolParameters = {
  type: 'object' as const,
  properties: {
    artifact_id: {
      type: 'string' as const,
      description: 'The UUID of the artifact (document) to read',
    },
  },
  required: ['artifact_id'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type ReadDocumentToolParameters = FromSchema<typeof readDocumentToolParameters>;

export class ReadDocumentTool extends Tool {
  constructor() {
    super({
      name: ToolType.READ_DOCUMENT,
      description:
        'Read the current content of an existing document. Use this before editing a document that the user may have modified.',
      descriptionLong:
        'Use read_document to retrieve the current content and version of a document. ' +
        'Always read a document before editing it when the document list indicates the user has made changes. ' +
        'The response includes the current version number — pass it as expected_version when calling update_document or edit_document.',
      parameters: readDocumentToolParameters,
      type: ToolType.READ_DOCUMENT,
    });
  }

  validateParams(params: Record<string, unknown>): ReadDocumentToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as ReadDocumentToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}
