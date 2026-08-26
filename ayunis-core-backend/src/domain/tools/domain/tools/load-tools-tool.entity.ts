import type { JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

export interface LoadToolsToolParameters {
  toolNames: string[];
}

export class LoadToolsTool extends Tool {
  constructor(deferredTools: Tool[]) {
    const toolNames = deferredTools.map((tool) => tool.name);
    const availableTools = deferredTools
      .map((tool) => `- ${tool.name}: ${tool.description}`)
      .join('\n');
    const parameters = {
      type: 'object',
      properties: {
        toolNames: {
          type: 'array',
          description: 'Names of the tools to load for the current task',
          items: { type: 'string', enum: toolNames },
          minItems: 1,
          maxItems: 4,
        },
      },
      required: ['toolNames'],
      additionalProperties: false,
    } as const satisfies JSONSchema;

    super({
      name: ToolType.LOAD_TOOLS,
      description:
        'Load additional tools when the current task requires a capability that is not yet available.',
      descriptionLong: `Call load_tools before using one of these deferred tools:\n${availableTools}`,
      parameters,
      type: ToolType.LOAD_TOOLS,
    });
  }

  validateParams(params: Record<string, unknown>): LoadToolsToolParameters {
    return validateToolParams<LoadToolsToolParameters>(this.parameters, params);
  }

  get returnsPii(): boolean {
    return false;
  }
}
