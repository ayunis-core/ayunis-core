import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { OparlToolScope } from './oparl-tool-scope';

const oparlGetToolParameters = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      format: 'uuid' as const,
      description:
        'ID of a paper, meeting, organization or person, as returned by oparl_search, oparl_list or oparl_get.',
    },
  },
  required: ['id'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type OparlGetToolParameters = FromSchema<typeof oparlGetToolParameters>;

export class OparlGetTool extends Tool {
  constructor(public readonly scope: OparlToolScope) {
    super({
      name: ToolType.OPARL_GET,
      description:
        'Get one object of the council information system by its ID: a paper with its consultations (its way through the committees, with the agenda items, results and resolutions), a meeting with its agenda items, results, resolution texts and documents, an organization with its memberships, or a person with their memberships.',
      parameters: oparlGetToolParameters,
      type: ToolType.OPARL_GET,
    });
  }

  validateParams(params: Record<string, unknown>): OparlGetToolParameters {
    return validateToolParams<OparlGetToolParameters>(this.parameters, params);
  }

  get returnsPii(): boolean {
    return false;
  }
}
