import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { DisplayableTool } from '../displayable-tool.entity';

// maxItems values must match MAX_SPREADSHEET_COLUMNS / MAX_SPREADSHEET_ROWS
// enforced by the artifacts module on every write.
const updateSpreadsheetToolParameters = {
  type: 'object' as const,
  properties: {
    artifact_id: {
      type: 'string' as const,
      description: 'The UUID of the existing spreadsheet artifact to update',
    },
    columns: {
      type: 'array' as const,
      items: { type: 'string' as const },
      minItems: 1,
      maxItems: 100,
      description: 'The complete column header labels, in order',
    },
    rows: {
      type: 'array' as const,
      maxItems: 5000,
      items: {
        type: 'array' as const,
        items: { type: ['string', 'number', 'null'] as const },
      },
      description:
        'The complete data rows. Each row is an array of cells in column order. Use numbers for numeric values (not strings), and null for empty cells. A string starting with "=" is an Excel formula, e.g. "=SUM(B2:B10)"; headers are row 1, so the first data row is row 2.',
    },
    expected_version: {
      type: 'integer' as const,
      description:
        'The version number you expect the spreadsheet to be at. Pass the version from your last create/update result. The operation will fail if the spreadsheet has been modified since.',
    },
  },
  required: ['artifact_id', 'columns', 'rows', 'expected_version'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type UpdateSpreadsheetToolParameters = FromSchema<
  typeof updateSpreadsheetToolParameters
>;

export class UpdateSpreadsheetTool extends DisplayableTool {
  override isExecutable: boolean = true;

  constructor() {
    super({
      name: ToolType.UPDATE_SPREADSHEET,
      description:
        'Update an existing spreadsheet with new columns and rows. Use this when the user asks you to modify or extend an existing spreadsheet.',
      descriptionLong:
        'Use update_spreadsheet when a spreadsheet already exists in the conversation (was previously created with create_spreadsheet). ' +
        'Use create_spreadsheet instead when the user wants a brand new spreadsheet. ' +
        'Always provide the complete columns and rows, not a diff — the update replaces the entire spreadsheet. ' +
        'Use numbers for numeric values and null for empty cells. ' +
        'Cells starting with "=" are Excel formulas (headers are row 1, data starts at row 2); prefer formulas over pre-computed aggregates. ' +
        'You must pass expected_version with the version number from your last tool result. ' +
        'If the spreadsheet was modified by the user since then, the operation will fail.',
      parameters: updateSpreadsheetToolParameters,
      type: ToolType.UPDATE_SPREADSHEET,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): UpdateSpreadsheetToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as UpdateSpreadsheetToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}
