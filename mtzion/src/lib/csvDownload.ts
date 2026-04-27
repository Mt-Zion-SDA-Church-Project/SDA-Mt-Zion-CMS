/** Excel-friendly UTF-8 CSV with BOM */
const CSV_BOM = '\uFEFF';

function escapeCsvCell(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsvLine(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsvCell).join(',');
}

export function downloadCsv(filename: string, headerRow: string, dataRows: string[]): void {
  const content = `${CSV_BOM}${headerRow}\r\n${dataRows.join('\r\n')}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function dateStampForFilename(): string {
  return new Date().toISOString().slice(0, 10);
}

export const MAX_CSV_EXPORT_ROWS = 20_000;
