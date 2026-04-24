import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { DisplayableTool } from '../displayable-tool.entity';

const updateJsxToolParameters = {
  type: 'object' as const,
  properties: {
    artifact_id: {
      type: 'string' as const,
      format: 'uuid' as const,
      description: 'The UUID of the existing JSX artifact to update',
    },
    content: {
      type: 'string' as const,
      description:
        'The full updated JSX source. Provide the complete component, not just the changes. Same constraints as create_jsx: no imports, no network, must define an App component.',
    },
    expected_version: {
      type: 'integer' as const,
      description:
        'The version number you expect the artifact to be at. Pass the version from your last create/update result. The operation will fail if the artifact has been modified since.',
    },
  },
  required: ['artifact_id', 'content', 'expected_version'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type UpdateJsxToolParameters = FromSchema<typeof updateJsxToolParameters>;

export class UpdateJsxTool extends DisplayableTool {
  override isExecutable: boolean = true;

  constructor() {
    super({
      name: ToolType.UPDATE_JSX,
      description:
        'Update an existing JSX artifact with a new React component source. Use this when the user asks you to modify or revise an existing JSX artifact.',
      descriptionLong:
        'Use update_jsx when a JSX artifact already exists in the conversation (was previously created with create_jsx). ' +
        'Use create_jsx instead when the user wants a brand new component. ' +
        'Always provide the full updated source, not a partial diff — components are usually small enough that full replacement is fine. ' +
        'You must pass expected_version with the version number from your last tool result. ' +
        'If the artifact was modified since then, the operation will fail.',
      parameters: updateJsxToolParameters,
      type: ToolType.UPDATE_JSX,
    });
  }

  validateParams(params: Record<string, unknown>): UpdateJsxToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as UpdateJsxToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}
