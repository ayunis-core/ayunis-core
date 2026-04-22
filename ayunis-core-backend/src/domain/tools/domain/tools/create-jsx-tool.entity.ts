import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { DisplayableTool } from '../displayable-tool.entity';

const createJsxToolParameters = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      description: 'The title of the JSX artifact to create',
    },
    content: {
      type: 'string' as const,
      description:
        'The full JSX source of a self-contained React component. It runs in a sandboxed iframe with React, ReactDOM, and Tailwind CSS preloaded as globals. Constraints: (1) Do not use import/export — use globals directly. (2) No network access — fetch and external URLs are blocked by CSP. (3) Must define a component named App — it will be mounted automatically with ReactDOM.createRoot. (4) Use Tailwind utility classes via className for styling. Do not wrap in code fences.',
    },
  },
  required: ['title', 'content'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type CreateJsxToolParameters = FromSchema<typeof createJsxToolParameters>;

export class CreateJsxTool extends DisplayableTool {
  override isExecutable: boolean = true;

  constructor() {
    super({
      name: ToolType.CREATE_JSX,
      description:
        'Create a new interactive React component that the user can view in a sandboxed preview. Use this when the user asks for a landing page, interactive widget, form mockup, custom visualisation, or anything richer than a static document or diagram. The component renders in an isolated iframe with React and Tailwind available as globals — no imports, no network calls. Do not use this for regular conversational answers, for text documents (use create_document), or for mermaid-based diagrams (use create_diagram).',
      parameters: createJsxToolParameters,
      type: ToolType.CREATE_JSX,
    });
  }

  validateParams(params: Record<string, unknown>): CreateJsxToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as CreateJsxToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}
