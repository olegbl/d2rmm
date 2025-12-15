import { notNull } from './notNull';

export function parseTsv(data: null | string): TSVData {
  if (data == null) {
    return { headers: [], rows: [] };
  }

  const [headersRaw, ...rowsRaw] = data.split('\n');
  const headers = headersRaw.split('\t');
  const rows: TSVDataRow[] = rowsRaw
    .map((row) => {
      if (row === '') {
        return null;
      }
      const rowRaw = row.split('\t');
      return rowRaw.reduce((agg, value, index) => {
        agg[headers[index]] = value;
        return agg;
      }, {} as TSVDataRow);
    })
    .filter(notNull);

  return { headers, rows };
}

export function encodeTsv(data: TSVData): string {
  const { headers, rows } = data;
  const headersRaw = headers.join('\t');
  const rowsRaw = rows.map((row) =>
    headers.map((header) => row[header] ?? '').join('\t'),
  );
  return [headersRaw, ...rowsRaw, ''].join('\n');
}
