import type { JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

export interface LoadableToolGroup {
  readonly id: string;
  /** The tools the group makes available once loaded. */
  readonly toolNames: readonly string[];
}

/** The tool groups a run could load: available and not loaded yet. */
export class LoadableToolGroups {
  constructor(public readonly groups: readonly LoadableToolGroup[]) {}
}

interface LoadToolsToolParameters {
  groups: string[];
}

function buildParameters(ids: string[]): JSONSchema {
  return {
    type: 'object' as const,
    properties: {
      groups: {
        type: 'array' as const,
        description:
          'The ids of the tool groups to load, from <available_tool_groups>.',
        items: { type: 'string' as const, enum: ids },
        minItems: 1,
      },
    },
    required: ['groups'],
    additionalProperties: false,
  } as const satisfies JSONSchema;
}

export class LoadToolsTool extends Tool {
  constructor(public readonly loadable: LoadableToolGroups) {
    super({
      name: ToolType.LOAD_TOOLS,
      description:
        'Load tool groups listed in <available_tool_groups>. Their tools become available once this call has returned and stay available for the rest of this chat.',
      parameters: buildParameters(loadable.groups.map((group) => group.id)),
      type: ToolType.LOAD_TOOLS,
    });
  }

  /**
   * Rejects ids that are not loadable (unknown, unavailable in this run or
   * already loaded) with the ids that are, so the model can correct the call.
   */
  validateParams(params: Record<string, unknown>): LoadToolsToolParameters {
    const requested = params.groups;
    if (Array.isArray(requested)) {
      const valid = new Set(this.loadable.groups.map((group) => group.id));
      const invalid = requested.filter(
        (id) => typeof id !== 'string' || !valid.has(id),
      );
      if (invalid.length > 0) {
        const validList =
          valid.size > 0
            ? [...valid].join(', ')
            : 'none, every group is loaded';
        throw new Error(
          `These tool groups cannot be loaded: ${invalid.map(String).join(', ')}. Valid groups: ${validList}.`,
        );
      }
    }
    return validateToolParams<LoadToolsToolParameters>(this.parameters, params);
  }

  /** The requested groups, each once. */
  groupsFor(params: LoadToolsToolParameters): LoadableToolGroup[] {
    const requested = new Set(params.groups);
    return this.loadable.groups.filter((group) => requested.has(group.id));
  }

  get returnsPii(): boolean {
    return false;
  }
}
