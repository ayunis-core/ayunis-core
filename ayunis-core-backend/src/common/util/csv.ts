export function parseCSV(csv: string, separator?: string) {
  separator = separator || (csv.split('\n')[0].includes(';') ? ';' : ',');
  const rows = csv.split('\n').map((row) => row.replace(/\r/g, ''));
  const headers = rows[0].split(separator);
  const data = rows.slice(1).map((row) => row.split(separator));
  return { headers, data };
}

export function convertCSVToString(data: {
  headers: string[];
  rows: string[][];
}): string {
  const allRows = [data.headers, ...data.rows];
  return allRows
    .map((row) =>
      row
        .map((cell) => `"${cell.replace(/"/g, '""').replace(/\r/g, '')}"`)
        .join(','),
    )
    .join('\n');
}
