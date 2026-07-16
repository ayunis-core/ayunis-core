import { UpdateSpreadsheetTool } from './update-spreadsheet-tool.entity';

describe('UpdateSpreadsheetTool', () => {
  it('accepts string, number, and null spreadsheet cells', () => {
    const tool = new UpdateSpreadsheetTool();

    expect(
      tool.validateParams({
        artifact_id: '323e4567-e89b-12d3-a456-426614174000',
        columns: ['Category', 'Amount'],
        rows: [
          ['Rent', 1200],
          ['Notes', null],
        ],
        expected_version: 2,
      }),
    ).toEqual({
      artifact_id: '323e4567-e89b-12d3-a456-426614174000',
      columns: ['Category', 'Amount'],
      rows: [
        ['Rent', 1200],
        ['Notes', null],
      ],
      expected_version: 2,
    });
  });
});
