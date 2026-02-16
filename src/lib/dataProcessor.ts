import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type ColumnType = 'numeric' | 'categorical' | 'datetime' | 'text' | 'id';

export interface ColumnInfo {
  name: string;
  type: ColumnType;
  missingCount: number;
  missingPercent: number;
  uniqueCount: number;
  stats?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    q1: number;
    q3: number;
    iqr: number;
    outliers: number;
  };
  topValues?: { value: string; count: number }[];
  dateRange?: { min: string; max: string };
}

export interface DatasetAnalysis {
  rows: number;
  columns: number;
  columnInfo: ColumnInfo[];
  cleanedData: Record<string, unknown>[];
  rawRowCount: number;
  duplicatesRemoved: number;
  missingPercent: number;
  qualityScore: number;
  dateRange?: { min: string; max: string };
  parsingErrors: number;
}

export async function parseFile(file: File, sheetIndex = 0): Promise<Record<string, unknown>[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return parseCSV(file);
  if (ext === 'xlsx' || ext === 'xls') return parseExcel(file, sheetIndex);
  throw new Error('Unsupported file type. Please upload CSV, XLSX, or XLS.');
}

function parseCSV(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (result) => resolve(result.data as Record<string, unknown>[]),
      error: (err) => reject(err),
    });
  });
}

function parseExcel(file: File, sheetIndex: number): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const sheetName = wb.SheetNames[sheetIndex] || wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
        resolve(data as Record<string, unknown>[]);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function getSheetNames(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        resolve(wb.SheetNames);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function detectColumnType(values: unknown[], colName: string): ColumnType {
  const nonEmpty = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonEmpty.length === 0) return 'text';

  const sample = nonEmpty.slice(0, 200);
  const uniqueRatio = new Set(nonEmpty.map(String)).size / nonEmpty.length;
  const lowerName = colName.toLowerCase();

  if (uniqueRatio > 0.95 && (lowerName.includes('id') || lowerName === '_id' || lowerName.endsWith('_id') || lowerName === 'index')) {
    return 'id';
  }

  const numericCount = sample.filter(v => !isNaN(Number(String(v).replace(/,/g, '')))).length;
  if (numericCount / sample.length > 0.8) return 'numeric';

  const datePatterns = [/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/, /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/, /^\w+ \d{1,2},? \d{4}/];
  const dateCount = sample.filter(v => {
    const s = String(v).trim();
    return datePatterns.some(p => p.test(s)) || (!isNaN(Date.parse(s)) && s.length > 4);
  }).length;
  if (dateCount / sample.length > 0.7) return 'datetime';

  const avgLen = nonEmpty.reduce<number>((a, v) => a + String(v).length, 0) / nonEmpty.length;
  if (uniqueRatio < 0.5 || (nonEmpty.length > 10 && new Set(nonEmpty.map(String)).size < 50)) return 'categorical';
  if (avgLen > 50) return 'text';

  return 'categorical';
}

export function analyzeDataset(rawData: Record<string, unknown>[]): DatasetAnalysis {
  if (!rawData.length) throw new Error('Empty dataset');

  const columns = Object.keys(rawData[0]);
  let parsingErrors = 0;
  const rawRowCount = rawData.length;

  // Trim & normalize
  let data = rawData.map(row => {
    const cleaned: Record<string, unknown> = {};
    columns.forEach(col => {
      let val = row[col];
      if (typeof val === 'string') val = val.trim();
      cleaned[col] = val;
    });
    return cleaned;
  });

  // Remove exact duplicates
  const seen = new Set<string>();
  const deduped: Record<string, unknown>[] = [];
  data.forEach(row => {
    const key = JSON.stringify(row);
    if (!seen.has(key)) { seen.add(key); deduped.push(row); }
  });
  const duplicatesRemoved = data.length - deduped.length;
  data = deduped;

  // Detect types
  const columnTypes = columns.map(col => ({
    name: col,
    type: detectColumnType(data.map(r => r[col]), col),
  }));

  // Convert numeric strings
  data = data.map(row => {
    const cleaned: Record<string, unknown> = {};
    columnTypes.forEach(({ name, type }) => {
      let val = row[name];
      if (type === 'numeric' && val !== null && val !== undefined && String(val).trim() !== '') {
        const num = Number(String(val).replace(/,/g, ''));
        if (!isNaN(num)) { cleaned[name] = num; }
        else { cleaned[name] = val; parsingErrors++; }
      } else {
        cleaned[name] = val;
      }
    });
    return cleaned;
  });

  // Calculate column info
  let totalMissing = 0;
  const totalCells = data.length * columns.length;
  let globalDateRange: { min: string; max: string } | undefined;

  const columnInfo: ColumnInfo[] = columnTypes.map(({ name, type }) => {
    const values = data.map(r => r[name]);
    const nonEmpty = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    const missingCount = values.length - nonEmpty.length;
    totalMissing += missingCount;

    const info: ColumnInfo = {
      name, type, missingCount,
      missingPercent: values.length > 0 ? (missingCount / values.length) * 100 : 0,
      uniqueCount: new Set(nonEmpty.map(String)).size,
    };

    if (type === 'numeric') {
      const nums = nonEmpty.map(v => Number(v)).filter(n => !isNaN(n)).sort((a, b) => a - b);
      if (nums.length > 0) {
        const q1 = nums[Math.floor(nums.length * 0.25)];
        const q3 = nums[Math.floor(nums.length * 0.75)];
        const iqr = q3 - q1;
        const outliers = nums.filter(n => n < q1 - 1.5 * iqr || n > q3 + 1.5 * iqr).length;
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const median = nums[Math.floor(nums.length / 2)];
        info.stats = { min: nums[0], max: nums[nums.length - 1], mean, median, q1, q3, iqr, outliers };
      }
      if (info.stats) {
        data.forEach(row => {
          if (row[name] === null || row[name] === undefined || String(row[name]).trim() === '') {
            row[name] = info.stats!.median;
          }
        });
      }
    }

    if (type === 'categorical') {
      const counts: Record<string, number> = {};
      nonEmpty.forEach(v => { const s = String(v); counts[s] = (counts[s] || 0) + 1; });
      info.topValues = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({ value, count }));
      if (info.topValues.length > 0) {
        const mode = info.topValues[0].value;
        data.forEach(row => {
          if (row[name] === null || row[name] === undefined || String(row[name]).trim() === '') {
            row[name] = mode;
          }
        });
      }
    }

    if (type === 'datetime') {
      const dates = nonEmpty.map(v => new Date(String(v))).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
      if (dates.length > 0) {
        info.dateRange = { min: dates[0].toISOString().split('T')[0], max: dates[dates.length - 1].toISOString().split('T')[0] };
        if (!globalDateRange) globalDateRange = info.dateRange;
      }
    }

    if (type === 'text') {
      data.forEach(row => { if (row[name] === null || row[name] === undefined) row[name] = ''; });
    }

    return info;
  });

  const missingPercent = totalCells > 0 ? (totalMissing / totalCells) * 100 : 0;
  const duplicatesRatio = rawRowCount > 0 ? (duplicatesRemoved / rawRowCount) * 100 : 0;
  const parsingErrorRatio = totalCells > 0 ? (parsingErrors / totalCells) * 100 : 0;
  const qualityScore = Math.max(0, Math.min(100, Math.round(
    100 - (missingPercent * 0.4 + duplicatesRatio * 0.3 + parsingErrorRatio * 0.3)
  )));

  return {
    rows: data.length, columns: columns.length, columnInfo, cleanedData: data,
    rawRowCount, duplicatesRemoved,
    missingPercent: Math.round(missingPercent * 100) / 100,
    qualityScore, dateRange: globalDateRange, parsingErrors,
  };
}

export function generateInsights(analysis: DatasetAnalysis): string[] {
  const insights: string[] = [];

  insights.push(`Dataset contains ${analysis.rows.toLocaleString()} rows across ${analysis.columns} columns.`);

  if (analysis.duplicatesRemoved > 0) {
    insights.push(`${analysis.duplicatesRemoved} duplicate rows were detected and removed.`);
  }

  if (analysis.qualityScore >= 90) insights.push(`Excellent data quality score of ${analysis.qualityScore}/100.`);
  else if (analysis.qualityScore >= 70) insights.push(`Good data quality score of ${analysis.qualityScore}/100.`);
  else insights.push(`Data quality score is ${analysis.qualityScore}/100 — consider reviewing data issues.`);

  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical' && c.topValues?.length);
  if (catCols.length > 0) {
    const col = catCols[0];
    insights.push(`Top value in "${col.name}" is "${col.topValues![0].value}" with ${col.topValues![0].count.toLocaleString()} occurrences.`);
  }

  const highMissing = analysis.columnInfo.filter(c => c.missingPercent > 20);
  if (highMissing.length > 0) {
    insights.push(`${highMissing.length} column(s) have >20% missing values: ${highMissing.map(c => c.name).join(', ')}.`);
  }

  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric' && c.stats);
  if (numCols.length > 0) {
    const col = numCols[0];
    insights.push(`"${col.name}" ranges from ${col.stats!.min.toLocaleString()} to ${col.stats!.max.toLocaleString()} (avg: ${col.stats!.mean.toFixed(2)}).`);
  }

  const outlierCols = numCols.filter(c => c.stats && c.stats.outliers > 0);
  if (outlierCols.length > 0) {
    const total = outlierCols.reduce((a, c) => a + c.stats!.outliers, 0);
    insights.push(`${total} potential outliers detected across ${outlierCols.length} numeric column(s).`);
  }

  if (analysis.dateRange) {
    insights.push(`Date range spans from ${analysis.dateRange.min} to ${analysis.dateRange.max}.`);
  }

  return insights;
}

export function toCSV(data: Record<string, unknown>[]): string {
  if (!data.length) return '';
  return Papa.unparse(data);
}

export function toExcelBlob(data: Record<string, unknown>[]): Blob {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cleaned Data');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
