import { ToolConfig } from './tool-config.entity';
import { Tool } from './tool.entity';
import { JSONSchema } from 'json-schema-to-ts';

export abstract class ConfigurableTool<T extends ToolConfig> extends Tool {
  public readonly config: T;

  constructor(params: {
    config: T;
    parameters: JSONSchema;
    description: string;
    descriptionLong?: string;
  }) {
    super({
      name: generateToolName(params.config),
      description: params.description,
      descriptionLong: params.descriptionLong,
      parameters: params.parameters,
      type: params.config.type,
    });
    this.config = params.config;
  }
}

function generateToolName(config: ToolConfig): string {
  return (
    config.type +
    '_' +
    config.displayName
      .toLowerCase()
      .replace(/ /g, '_')
      .replace(/[^a-z0-9_]/g, '')
  );
}
