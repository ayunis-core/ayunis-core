import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from 'src/domain/tools/domain/tool.entity';

const readDiagramToolParameters = {
  type: 'object' as const,
  properties: {
    artifact_id: {
      type: 'string' as const,
      description: 'The UUID of the diagram artifact to read',
    },
    startLine: {
      type: 'integer' as const,
      description: 'Starting line number (1-indexed). Defaults to 1.',
      minimum: 1,
      default: 1,
    },
    numLines: {
      type: 'integer' as const,
      description: 'Number of lines to read. Defaults to 500. Maximum 500.',
      minimum: 1,
      maximum: 500,
      default: 500,
    },
  },
  required: ['artifact_id'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type ReadDiagramToolParameters = FromSchema<typeof readDiagramToolParameters>;

export class ReadDiagramTool extends Tool {
  constructor() {
    super({
      name: ToolType.READ_DIAGRAM,
      description:
        'Read the current mermaid source and version of an existing diagram. Use this before updating a diagram whose current version or content you do not know, for example because the user edited it.',
      descriptionLong:
        'Use read_diagram to retrieve the current mermaid source and version of a diagram. ' +
        'The response includes the current version number on every page — pass it as expected_version when calling update_diagram. ' +
        'Use nextPage.startLine from a truncated result to read the next page.',
      parameters: readDiagramToolParameters,
      type: ToolType.READ_DIAGRAM,
    });
  }

  validateParams(params: Record<string, unknown>): ReadDiagramToolParameters {
    return validateToolParams<ReadDiagramToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
