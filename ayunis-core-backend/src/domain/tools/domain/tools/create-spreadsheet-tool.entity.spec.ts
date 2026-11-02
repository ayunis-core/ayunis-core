import { CreateSpreadsheetTool } from './create-spreadsheet-tool.entity';

describe('CreateSpreadsheetTool', () => {
  it('accepts string, number, and null spreadsheet cells', () => {
    const tool = new CreateSpreadsheetTool();

    expect(
      tool.validateParams({
        title: 'Quarterly budget',
        columns: ['Category', 'Amount'],
        rows: [
          ['Rent', 1200],
          ['Notes', null],
        ],
      }),
    ).toEqual({
      title: 'Quarterly budget',
      columns: ['Category', 'Amount'],
      rows: [
        ['Rent', 1200],
        ['Notes', null],
      ],
    });
  });

  it('accepts a data source import without columns and rows', () => {
    const tool = new CreateSpreadsheetTool();
    const input = {
      title: 'Bookings',
      data_source_id: '6f1c2a9e-2f9b-4c55-9d0e-7c1a3b4d5e6f',
    };

    expect(tool.validateParams(input)).toEqual(input);
  });
});
