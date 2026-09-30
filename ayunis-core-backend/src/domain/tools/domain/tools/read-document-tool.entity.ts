import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from 'src/domain/tools/domain/tool.entity';

const readDocumentToolParameters = {
  type: 'object' as const,
  properties: {
    artifact_id: {
      type: 'string' as const,
      description: 'The UUID of the artifact (document) to read',
    },
    startLine: {
      type: 'integer' as const,
      description: 'Starting line number (1-indexed). Defaults to 1.',
      minimum: 1,
      default: 1,
    },
    numLines: {
      type: 'integer' as const,
      description: 'Number of lines to read. Defaults to 200. Maximum 200.',
      minimum: 1,
      maximum: 200,
      default: 200,
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
        'The response includes the current version number on every page — pass it as expected_version when calling update_document or edit_document. ' +
        'Use nextPage.startLine from a truncated result to read the next page.',
      parameters: readDocumentToolParameters,
      type: ToolType.READ_DOCUMENT,
    });
  }

  validateParams(params: Record<string, unknown>): ReadDocumentToolParameters {
    return validateToolParams<ReadDocumentToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
