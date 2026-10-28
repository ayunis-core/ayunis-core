import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { ToolType } from '../value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from '../tool.entity';

const updateDiagramToolParameters = {
  type: 'object' as const,
  properties: {
    artifact_id: {
      type: 'string' as const,
      description: 'The UUID of the existing diagram artifact to update',
    },
    content: {
      type: 'string' as const,
      description:
        'The full updated mermaid source of the diagram. Provide the complete source, not just the changes.',
    },
    expected_version: {
      type: 'integer' as const,
      description:
        'The version number you expect the diagram to be at. Pass the version from your last create/update result. The operation will fail if the diagram has been modified since.',
    },
  },
  required: ['artifact_id', 'content', 'expected_version'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type UpdateDiagramToolParameters = FromSchema<
  typeof updateDiagramToolParameters
>;

export class UpdateDiagramTool extends Tool {
  constructor() {
    super({
      name: ToolType.UPDATE_DIAGRAM,
      description:
        'Update an existing diagram with new mermaid source. Use this when the user asks you to modify or revise an existing diagram.',
      descriptionLong:
        'Use update_diagram when a diagram already exists in the conversation (was previously created with create_diagram). ' +
        'Use create_diagram instead when the user wants a brand new diagram. ' +
        'Always provide the full updated mermaid source, not a partial diff — diagrams are small enough that full replacement is fine. ' +
        'You must pass expected_version with the version number from your last tool result. ' +
        'If the diagram was modified by the user since then, the operation will fail.',
      parameters: updateDiagramToolParameters,
      type: ToolType.UPDATE_DIAGRAM,
    });
  }

  validateParams(params: Record<string, unknown>): UpdateDiagramToolParameters {
    return validateToolParams<UpdateDiagramToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
