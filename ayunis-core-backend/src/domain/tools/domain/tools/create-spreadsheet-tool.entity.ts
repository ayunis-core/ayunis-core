import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { DisplayableTool } from '../displayable-tool.entity';

// maxItems values must match MAX_SPREADSHEET_COLUMNS / MAX_SPREADSHEET_ROWS
// enforced by the artifacts module on every write.
const createSpreadsheetToolParameters = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      description: 'The title of the spreadsheet to create',
    },
    columns: {
      type: 'array' as const,
      items: { type: 'string' as const },
      minItems: 1,
      maxItems: 100,
      description: 'The column header labels, in order',
    },
    rows: {
      type: 'array' as const,
      maxItems: 5000,
      items: {
        type: 'array' as const,
        items: { type: ['string', 'number', 'null'] as const },
      },
      description:
        'The data rows. Each row is an array of cells in column order. Use numbers for numeric values (not strings), and null for empty cells.',
    },
  },
  required: ['title', 'columns', 'rows'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type CreateSpreadsheetToolParameters = FromSchema<
  typeof createSpreadsheetToolParameters
>;

export class CreateSpreadsheetTool extends DisplayableTool {
  override isExecutable: boolean = true;

  constructor() {
    super({
      name: ToolType.CREATE_SPREADSHEET,
      description:
        'Create a new spreadsheet with tabular data that the user can view, edit in a grid, and export to Excel (.xlsx) or CSV. Use this when the user asks for a table, budget, list, or dataset they will want to edit or export. For a quick illustrative table inside an answer, prefer an inline markdown table instead.',
      parameters: createSpreadsheetToolParameters,
      type: ToolType.CREATE_SPREADSHEET,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): CreateSpreadsheetToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as CreateSpreadsheetToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}
