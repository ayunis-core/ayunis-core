import type { UUID } from 'crypto';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  OPARL_BODY_IDS_PARAMETER,
  parseOparlDateRange,
  parseOparlTextFilter,
  type OparlToolScope,
} from './oparl-tool-scope';

export const OPARL_LIST_TYPES = [
  'meetings',
  'organizations',
  'persons',
] as const;

export type OparlListToolType = (typeof OPARL_LIST_TYPES)[number];

const oparlListToolParameters = {
  type: 'object' as const,
  properties: {
    type: {
      type: 'string' as const,
      enum: OPARL_LIST_TYPES,
      description:
        'meetings (latest first), organizations (council, committees, factions and other bodies, by name) or persons (by name).',
    },
    bodyIds: OPARL_BODY_IDS_PARAMETER,
    name: {
      type: 'string' as const,
      minLength: 1,
      maxLength: 200,
      description:
        'Only those whose name contains this text, case-insensitive (organizations: also the short name).',
    },
    from: {
      type: 'string' as const,
      description: 'Meetings only: starting on or after this day (YYYY-MM-DD).',
    },
    to: {
      type: 'string' as const,
      description:
        'Meetings only: starting on or before this day (YYYY-MM-DD).',
    },
    organizationId: {
      type: 'string' as const,
      format: 'uuid' as const,
      description:
        'Meetings of this organization, or persons who are or were members of it.',
    },
    page: {
      type: 'integer' as const,
      minimum: 1,
      description: 'Page of 20, starting at 1. Defaults to 1.',
    },
  },
  required: ['type'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type OparlListToolParameters = FromSchema<typeof oparlListToolParameters>;

export interface OparlListParameters {
  type: OparlListToolType;
  bodyIds: UUID[];
  filters: {
    name?: string;
    from?: string;
    to?: string;
    organizationId?: UUID;
  };
  page: number;
}

export class OparlListTool extends Tool {
  constructor(public readonly scope: OparlToolScope) {
    super({
      name: ToolType.OPARL_LIST,
      description:
        'List meetings, organizations or persons of the council information system, filtered and a page of 20 at a time, e.g. the meetings of a committee in a period, the factions, or the members of a committee.',
      parameters: oparlListToolParameters,
      type: ToolType.OPARL_LIST,
    });
  }

  validateParams(params: Record<string, unknown>): OparlListParameters {
    const validated = validateToolParams<OparlListToolParameters>(
      this.parameters,
      params,
    );
    const range = parseOparlDateRange(validated);
    if ((range.from || range.to) && validated.type !== 'meetings') {
      throw new Error("'from' and 'to' apply to meetings only");
    }
    if (validated.organizationId && validated.type === 'organizations') {
      throw new Error("'organizationId' applies to meetings and persons only");
    }
    return {
      type: validated.type,
      bodyIds: (validated.bodyIds ?? []) as UUID[],
      filters: {
        ...range,
        name: parseOparlTextFilter('name', validated.name),
        organizationId: validated.organizationId as UUID | undefined,
      },
      page: validated.page ?? 1,
    };
  }

  get returnsPii(): boolean {
    return false;
  }
}
