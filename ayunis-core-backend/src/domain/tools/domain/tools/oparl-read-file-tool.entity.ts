import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { OparlToolScope } from './oparl-tool-scope';

const oparlReadFileToolParameters = {
  type: 'object' as const,
  properties: {
    fileId: {
      type: 'string' as const,
      format: 'uuid' as const,
      description:
        'ID of a document (file), as returned by oparl_search or oparl_get.',
    },
    fromPage: {
      type: 'integer' as const,
      minimum: 1,
      description:
        'The page to start with (1 is the first). Pass nextPage of the previous result to read on. Defaults to 1.',
    },
  },
  required: ['fileId'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type OparlReadFileToolParameters = FromSchema<
  typeof oparlReadFileToolParameters
>;

export class OparlReadFileTool extends Tool {
  constructor(public readonly scope: OparlToolScope) {
    super({
      name: ToolType.OPARL_READ_FILE,
      description:
        'Read the text of a document of the council information system (a paper, protocol, resolution or attachment), page by page. Returns as many pages as fit and the next page to read on with.',
      parameters: oparlReadFileToolParameters,
      type: ToolType.OPARL_READ_FILE,
    });
  }

  validateParams(params: Record<string, unknown>): OparlReadFileToolParameters {
    return validateToolParams<OparlReadFileToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
