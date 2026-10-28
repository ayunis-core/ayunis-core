import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { ToolType } from '../value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from '../tool.entity';

const createDiagramToolParameters = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      description: 'The title of the diagram to create',
    },
    content: {
      type: 'string' as const,
      description:
        'The full mermaid source of the diagram. Start with a mermaid diagram declaration (e.g. "flowchart TD", "sequenceDiagram", "erDiagram"). Do not wrap in code fences.',
    },
  },
  required: ['title', 'content'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type CreateDiagramToolParameters = FromSchema<
  typeof createDiagramToolParameters
>;

export class CreateDiagramTool extends Tool {
  constructor() {
    super({
      name: ToolType.CREATE_DIAGRAM,
      description:
        'Create a new visual diagram that the user can view and export. Use this when the user asks for a flowchart, sequence diagram, entity-relationship diagram, class diagram, or similar — anything expressed as mermaid source. Do not use this for regular conversational answers or for text documents (use create_document instead).',
      parameters: createDiagramToolParameters,
      type: ToolType.CREATE_DIAGRAM,
    });
  }

  validateParams(params: Record<string, unknown>): CreateDiagramToolParameters {
    return validateToolParams<CreateDiagramToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
