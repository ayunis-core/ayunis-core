import Ajv from 'ajv';
import { ConfigurableTool } from '../configurable-tool.entity';
import { ToolConfig } from '../tool-config.entity';
import { UUID } from 'crypto';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ToolType } from '../value-objects/tool-type.enum';

export enum HttpToolMethod {
  GET = 'GET',
  POST = 'POST',
}

export class HttpToolConfig extends ToolConfig {
  public readonly method: HttpToolMethod;
  public readonly endpointUrl: string;
  public readonly description: string;

  constructor(params: {
    id?: UUID;
    displayName: string;
    description: string;
    userId: UUID;
    method: HttpToolMethod;
    endpointUrl: string;
  }) {
    super({
      id: params.id,
      type: ToolType.HTTP,
      displayName: params.displayName,
      userId: params.userId,
    });
    this.method = params.method;
    this.endpointUrl = params.endpointUrl;
    this.description = params.description;
  }
}

const httpToolParameters = {
  type: 'object' as const,
  properties: {
    bodyOrQueryParams: {
      type: 'string' as const,
      description:
        'The input to the tool as a stringified JSON object. For GET requests, this is the query parameters. For POST requests, this is the body. If the description does not specify any necessary parameters, this can be "{}".',
    },
  },
  required: ['bodyOrQueryParams'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type HttpToolParameters = FromSchema<typeof httpToolParameters>;

export class HttpTool extends ConfigurableTool<HttpToolConfig> {
  constructor(config: HttpToolConfig) {
    super({
      config,
      parameters: httpToolParameters,
      description: config.description,
    });
  }

  validateParams(params: Record<string, any>): HttpToolParameters {
    const ajv = new Ajv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as HttpToolParameters;
  }
}
