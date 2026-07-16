import { CreateSpreadsheetTool } from './create-spreadsheet-tool.entity';

describe('CreateSpreadsheetTool', () => {
  it('accepts string, number, and null spreadsheet cells', () => {
    const tool = new CreateSpreadsheetTool();

    expect(
      tool.validateParams({
        title: 'Quarterly budget',
        columns: ['Category', 'Amount'],
        rows: [['Rent', 1200], ['Notes', null]],
      }),
    ).toEqual({
      title: 'Quarterly budget',
      columns: ['Category', 'Amount'],
      rows: [['Rent', 1200], ['Notes', null]],
    });
  });
});
