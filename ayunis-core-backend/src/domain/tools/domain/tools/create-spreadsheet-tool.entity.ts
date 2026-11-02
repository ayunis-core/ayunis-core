import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from 'src/domain/tools/domain/tool.entity';

// maxItems values must match MAX_SPREADSHEET_COLUMNS / MAX_SPREADSHEET_ROWS
// enforced by the artifacts module on every write.
const createSpreadsheetToolParameters = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      description: 'The title of the spreadsheet to create',
    },
    data_source_id: {
      type: 'string' as const,
      description:
        'UUID of a CSV data source in this conversation to import as the complete spreadsheet. The CSV header becomes the columns and every row is copied server-side. Cell values are kept as text, except that empty cells become null and plain numbers (including German amounts like 1.234,56) become numbers; zero-padded values and values with more than 15 significant digits stay text. Omit columns and rows when using this.',
    },
    columns: {
      type: 'array' as const,
      items: { type: 'string' as const },
      minItems: 1,
      maxItems: 100,
      description:
        'The column header labels, in order. Required unless data_source_id is given.',
    },
    rows: {
      type: 'array' as const,
      maxItems: 5000,
      items: {
        type: 'array' as const,
        items: {
          anyOf: [
            { type: 'string' as const },
            { type: 'number' as const },
            { type: 'null' as const },
          ],
        },
      },
      description:
        'Required unless data_source_id is given. The data rows. Each row is an array of cells in column order. Use numbers for numeric values (not strings), and null for empty cells. A string starting with "=" is an Excel formula, e.g. "=SUM(B2:B10)"; headers are row 1, so the first data row is row 2.',
    },
  },
  required: ['title'],
  additionalProperties: false,
} as const satisfies JSONSchema;

export type CreateSpreadsheetToolParameters = FromSchema<
  typeof createSpreadsheetToolParameters
>;

export class CreateSpreadsheetTool extends Tool {
  constructor() {
    super({
      name: ToolType.CREATE_SPREADSHEET,
      description:
        'Create a new spreadsheet with tabular data that the user can view, edit in a grid, and export to Excel (.xlsx) or CSV. Use this when the user asks for a table, budget, list, or dataset they will want to edit or export. For a quick illustrative table inside an answer, prefer an inline markdown table instead. Prefer Excel formulas (cells starting with "=") over pre-computed totals so derived values stay correct when the user edits the data. When the rows come from a CSV data source or a code_execution result, never type them out: write the finished table with code_execution to /execution/output/<name>.csv and pass the data source ID it reports as data_source_id, which copies every row server-side.',
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
