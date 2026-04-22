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
        'The full JSX source of a self-contained React component. Constraints: (1) Define exactly one top-level component named App — the sandbox mounts it automatically. (2) React (default export and hooks) is available as a global named React; do not mount it yourself. (3) Use Tailwind CSS utility classes via className for styling. (4) No import or require statements. (5) No other libraries. (6) No network calls and no access to the parent window. (7) Do not wrap the source in code fences.',
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
        'Create a new interactive React component that the user can view in a sandboxed preview. Use this when the user asks for a landing page, interactive widget, form mockup, custom visualisation, or anything richer than a static document or diagram. The component renders in an isolated iframe; React (global React with hooks) and Tailwind CSS utility classes are the only allowed tools — no imports, no other libraries, no network calls. Define exactly one top-level component named App. Do not use this for regular conversational answers, for text documents (use create_document), or for mermaid-based diagrams (use create_diagram).',
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
