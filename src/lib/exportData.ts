import * as XLSX from 'xlsx';

export function exportAsCSV(data: Record<string, unknown>[], fileName: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const v = String(row[h] ?? '');
      return v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','))
  ].join('\n');

  download(csv, `${fileName.replace(/\.\w+$/, '')}_export.csv`, 'text/csv');
}

export function exportAsJSON(data: Record<string, unknown>[], fileName: string) {
  if (!data.length) return;
  const json = JSON.stringify(data, null, 2);
  download(json, `${fileName.replace(/\.\w+$/, '')}_export.json`, 'application/json');
}

export function exportAsExcel(data: Record<string, unknown>[], fileName: string) {
  if (!data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${fileName.replace(/\.\w+$/, '')}_export.xlsx`);
}

function download(content: string, name: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
