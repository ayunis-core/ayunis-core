import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { BPMN_CONTENT_DESCRIPTION } from './create-bpmn-tool.entity';

const updateBpmnToolParameters = {
  type: 'object' as const,
  properties: {
    artifact_id: {
      type: 'string' as const,
      description: 'The UUID of the existing BPMN process model to update',
    },
    content: {
      type: 'string' as const,
      description: BPMN_CONTENT_DESCRIPTION,
    },
    expected_version: {
      type: 'integer' as const,
      description:
        'The version number you expect the process model to be at. Pass the version from your last create/update result. The operation will fail if the process model has been modified since.',
    },
  },
  required: ['artifact_id', 'content', 'expected_version'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type UpdateBpmnToolParameters = FromSchema<typeof updateBpmnToolParameters>;

export class UpdateBpmnTool extends Tool {
  constructor() {
    super({
      name: ToolType.UPDATE_BPMN,
      description:
        'Update an existing BPMN process model with new BPMN 2.0 XML. Use this when the user asks you to modify or revise an existing process model.',
      descriptionLong:
        'Use update_bpmn when a process model already exists in the conversation (was previously created with create_bpmn). ' +
        'Use create_bpmn instead when the user wants a brand new process model. ' +
        'Always provide the complete updated process, not a partial diff. ' +
        'You must pass expected_version with the version number from your last tool result. ' +
        'If the process model was modified since then, the operation will fail.',
      parameters: updateBpmnToolParameters,
      type: ToolType.UPDATE_BPMN,
    });
  }

  validateParams(params: Record<string, unknown>): UpdateBpmnToolParameters {
    return validateToolParams<UpdateBpmnToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
