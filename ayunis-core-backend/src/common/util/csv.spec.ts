import { parseCSV, convertCSVToString } from './csv';

describe('parseCSV', () => {
  it('parses a simple comma-delimited file into headers and rows', () => {
    const csv = 'name,age\nAlice,30\nBob,25';
    const { headers, data } = parseCSV(csv);
    expect(headers).toEqual(['name', 'age']);
    expect(data).toEqual([
      ['Alice', '30'],
      ['Bob', '25'],
    ]);
  });

  it('auto-detects a semicolon delimiter across the whole file', () => {
    const csv = 'name;age;city\nAlice;30;Berlin\nBob;25;Munich';
    const { headers, data } = parseCSV(csv);
    expect(headers).toEqual(['name', 'age', 'city']);
    expect(data).toEqual([
      ['Alice', '30', 'Berlin'],
      ['Bob', '25', 'Munich'],
    ]);
  });

  it('keeps a quoted field that contains the delimiter as a single cell', () => {
    const csv = 'name,note\n"Smith, John",hello\nBob,world';
    const { headers, data } = parseCSV(csv);
    expect(headers).toEqual(['name', 'note']);
    expect(data).toEqual([
      ['Smith, John', 'hello'],
      ['Bob', 'world'],
    ]);
  });

  it('keeps a quoted field that contains a newline as a single row', () => {
    const csv = 'name,note\n"line one\nline two",ok';
    const { data } = parseCSV(csv);
    expect(data).toEqual([['line one\nline two', 'ok']]);
  });

  it('unescapes doubled quotes inside a quoted field', () => {
    const csv = 'name,quote\nAlice,"she said ""hi"""';
    const { data } = parseCSV(csv);
    expect(data).toEqual([['Alice', 'she said "hi"']]);
  });

  it('handles CRLF line endings', () => {
    const csv = 'a,b\r\n1,2\r\n3,4';
    const { headers, data } = parseCSV(csv);
    expect(headers).toEqual(['a', 'b']);
    expect(data).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('respects an explicit separator argument', () => {
    const csv = 'a|b\n1|2';
    const { headers, data } = parseCSV(csv, '|');
    expect(headers).toEqual(['a', 'b']);
    expect(data).toEqual([['1', '2']]);
  });

  it('returns empty headers and data for empty input', () => {
    expect(parseCSV('')).toEqual({ headers: [], data: [] });
  });

  it('returns empty data for a header-only file', () => {
    const { headers, data } = parseCSV('a,b,c');
    expect(headers).toEqual(['a', 'b', 'c']);
    expect(data).toEqual([]);
  });
});

describe('convertCSVToString', () => {
  it('serializes headers and rows into valid CSV', () => {
    const csv = convertCSVToString({
      headers: ['name', 'age'],
      rows: [['Alice', '30']],
    });
    const { headers, data } = parseCSV(csv);
    expect(headers).toEqual(['name', 'age']);
    expect(data).toEqual([['Alice', '30']]);
  });

  it('round-trips values containing commas, quotes and newlines losslessly', () => {
    const original = {
      headers: ['name', 'note'],
      rows: [
        ['Smith, John', 'she said "hi"'],
        ['multi', 'line one\nline two'],
      ],
    };
    const csv = convertCSVToString(original);
    const { headers, data } = parseCSV(csv);
    expect(headers).toEqual(original.headers);
    expect(data).toEqual(original.rows);
  });
});
