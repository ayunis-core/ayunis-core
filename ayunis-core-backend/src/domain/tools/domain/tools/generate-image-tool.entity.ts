import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from '../tool.entity';
import { ToolExecutionFailedError } from '../../application/tools.errors';

const generateImageToolParameters = {
  type: 'object' as const,
  properties: {
    prompt: {
      type: 'string' as const,
      description: 'A detailed text description of the image to generate',
      maxLength: 4000,
    },
  },
  required: ['prompt'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type GenerateImageToolParameters = FromSchema<
  typeof generateImageToolParameters
>;

export class GenerateImageTool extends Tool {
  constructor() {
    super({
      name: ToolType.GENERATE_IMAGE,
      description:
        'Generate an image from a text description. Returns a unique image ID that references the generated image.',
      descriptionLong:
        'Use when the user asks you to create, draw, design, or generate an image, illustration, diagram, or visual content. The tool returns an image ID; you do not need to display the image yourself as it will be rendered automatically.',
      parameters: generateImageToolParameters,
      type: ToolType.GENERATE_IMAGE,
    });
  }

  validateParams(params: Record<string, unknown>): GenerateImageToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      const details =
        validate.errors
          ?.map((e) => `${e.instancePath} ${e.message}`.trim())
          .join('; ') ?? '';
      throw new ToolExecutionFailedError({
        toolName: this.name,
        message: 'Invalid parameters for generate_image tool',
        exposeToLLM: true,
        metadata: details ? { validationErrors: details } : undefined,
      });
    }
    return params as GenerateImageToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}
