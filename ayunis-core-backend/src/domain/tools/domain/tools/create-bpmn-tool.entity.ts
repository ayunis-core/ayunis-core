import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from 'src/domain/tools/domain/tool.entity';

export const BPMN_CONTENT_DESCRIPTION =
  'The complete BPMN 2.0 XML of the process, without code fences. ' +
  'Root element <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="..."> containing one <bpmn:process>. ' +
  'Model only the process semantics: events, tasks (task, userTask, serviceTask, sendTask, receiveTask, manualTask, businessRuleTask), gateways, sub-processes and sequence flows. ' +
  'Do not include bpmndi layout elements; the layout is computed automatically. ' +
  'IDs must be ASCII letters, digits and underscores, starting with a letter (e.g. Task_CheckApplication). ' +
  'Every sequenceFlow needs sourceRef and targetRef. Label each outgoing sequenceFlow of an exclusive gateway with its name attribute (e.g. name="Yes"); only the name is displayed. ' +
  'Lanes are kept in the file but not drawn, so when responsibilities matter, also put the responsible role into the task name (e.g. "Citizen office: check application"). ' +
  'Write names in the language of the conversation.';

const createBpmnToolParameters = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      description: 'The title of the process model to create',
    },
    content: {
      type: 'string' as const,
      description: BPMN_CONTENT_DESCRIPTION,
    },
  },
  required: ['title', 'content'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type CreateBpmnToolParameters = FromSchema<typeof createBpmnToolParameters>;

export class CreateBpmnTool extends Tool {
  constructor() {
    super({
      name: ToolType.CREATE_BPMN,
      description:
        'Create a new BPMN 2.0 process model that the user can view and export as a .bpmn file. Use this when the user asks for a business process model, BPMN diagram, or process documentation in BPMN notation. Use create_diagram for other flowcharts.',
      parameters: createBpmnToolParameters,
      type: ToolType.CREATE_BPMN,
    });
  }

  validateParams(params: Record<string, unknown>): CreateBpmnToolParameters {
    return validateToolParams<CreateBpmnToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
