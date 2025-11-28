import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ToolType } from '../value-objects/tool-type.enum';
import Ajv from 'ajv';
import { Tool } from '../tool.entity';

export enum ProductKnowledgeTopic {
  GETTING_STARTED = 'getting_started',
  AGENTS = 'agents',
  TOOLS = 'tools',
  PROMPTS = 'prompts',
  SOURCES = 'sources',
  MODELS = 'models',
}

const productKnowledgeToolParameters = {
  type: 'object' as const,
  properties: {
    topic: {
      type: 'string' as const,
      enum: Object.values(ProductKnowledgeTopic),
      description: 'The documentation topic to retrieve',
    },
  },
  required: ['topic'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type ProductKnowledgeToolParameters = FromSchema<
  typeof productKnowledgeToolParameters
>;

export class ProductKnowledgeTool extends Tool {
  constructor() {
    super({
      name: ToolType.PRODUCT_KNOWLEDGE,
      description:
        'Retrieve product documentation and help content about Ayunis features. ' +
        'Use this tool to answer questions about how to use agents, tools, prompts, sources, and models. ' +
        'Available topics: getting_started, agents, tools, prompts, sources, models.',
      parameters: productKnowledgeToolParameters,
      type: ToolType.PRODUCT_KNOWLEDGE,
    });
  }

  validateParams(params: Record<string, any>): ProductKnowledgeToolParameters {
    const ajv = new Ajv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as ProductKnowledgeToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}
