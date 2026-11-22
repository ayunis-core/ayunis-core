import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from 'src/domain/tools/domain/tool.entity';

const readSpreadsheetToolParameters = {
  type: 'object' as const,
  properties: {
    artifact_id: {
      type: 'string' as const,
      description: 'The UUID of the spreadsheet artifact to read',
    },
    startRow: {
      type: 'integer' as const,
      description:
        'First data row to read (1-indexed, not counting the header). Defaults to 1.',
      minimum: 1,
      default: 1,
    },
    numRows: {
      type: 'integer' as const,
      description: 'Number of data rows to read. Defaults to 500. Maximum 500.',
      minimum: 1,
      maximum: 500,
      default: 500,
    },
  },
  required: ['artifact_id'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type ReadSpreadsheetToolParameters = FromSchema<
  typeof readSpreadsheetToolParameters
>;

export class ReadSpreadsheetTool extends Tool {
  constructor() {
    super({
      name: ToolType.READ_SPREADSHEET,
      description:
        'Read the current columns, rows and version of an existing spreadsheet. Use this before updating a spreadsheet whose current version or content you do not know, for example because the user edited it.',
      descriptionLong:
        'Use read_spreadsheet to retrieve the current version, columns and rows of a spreadsheet. ' +
        'columns and rows have the same shape update_spreadsheet takes: formulas are returned as their "=" source, empty cells as null. ' +
        'Data row N is row N+1 in formulas, because the header is row 1. ' +
        'The response includes the current version number on every page — pass it as expected_version when calling update_spreadsheet. ' +
        'update_spreadsheet replaces the whole spreadsheet, so when a result is truncated, read every page (nextPage.startRow) before updating.',
      parameters: readSpreadsheetToolParameters,
      type: ToolType.READ_SPREADSHEET,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): ReadSpreadsheetToolParameters {
    return validateToolParams<ReadSpreadsheetToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}
