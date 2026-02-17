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
  if (ext === 'json') return parseJSON(file);
  if (ext === 'sql') return parseSQL(file);
  throw new Error('Unsupported file type. Please upload CSV, XLSX, XLS, JSON, or SQL.');
}

function parseSQL(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const sql = e.target?.result as string;
        const data = extractDataFromSQL(sql);
        if (!data.length) throw new Error('No INSERT data found in SQL file. Ensure it contains INSERT INTO statements.');
        resolve(data);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function extractDataFromSQL(sql: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];

  // Extract column names from CREATE TABLE if available
  const createMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([\s\S]*?)\);/i);
  let columnNames: string[] = [];
  if (createMatch) {
    const colDefs = createMatch[2];
    columnNames = colDefs
      .split(',')
      .map(line => line.trim())
      .filter(line => !line.match(/^\s*(PRIMARY|UNIQUE|INDEX|KEY|CONSTRAINT|CHECK|FOREIGN)/i))
      .map(line => {
        const match = line.match(/^[`"']?(\w+)[`"']?\s+/);
        return match ? match[1] : '';
      })
      .filter(Boolean);
  }

  // Parse INSERT INTO statements
  const insertRegex = /INSERT\s+INTO\s+[`"']?(\w+)[`"']?\s*(?:\(([^)]+)\))?\s*VALUES\s*([\s\S]*?)(?:;|$)/gi;
  let insertMatch;
  
  while ((insertMatch = insertRegex.exec(sql)) !== null) {
    // Column names from INSERT statement take priority
    const insertCols = insertMatch[2]
      ? insertMatch[2].split(',').map(c => c.trim().replace(/[`"']/g, ''))
      : columnNames;

    const valuesStr = insertMatch[3];
    // Match each (...) group
    const rowRegex = /\(([^)]+)\)/g;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(valuesStr)) !== null) {
      const values = parseInsertValues(rowMatch[1]);
      const row: Record<string, unknown> = {};
      values.forEach((val, i) => {
        const colName = insertCols[i] || `col_${i + 1}`;
        row[colName] = val;
      });
      rows.push(row);
    }
  }

  return rows;
}

function parseInsertValues(valuesStr: string): unknown[] {
  const values: unknown[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < valuesStr.length; i++) {
    const ch = valuesStr[i];
    
    if (inString) {
      if (ch === stringChar && valuesStr[i + 1] !== stringChar) {
        inString = false;
        values.push(current);
        current = '';
      } else if (ch === stringChar && valuesStr[i + 1] === stringChar) {
        current += ch;
        i++; // skip escaped quote
      } else {
        current += ch;
      }
    } else if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current = '';
    } else if (ch === ',') {
      if (current.trim()) {
        values.push(parseSQLValue(current.trim()));
        current = '';
      }
    } else {
      current += ch;
    }
  }
  
  if (current.trim() && !inString) {
    values.push(parseSQLValue(current.trim()));
  }
  
  return values;
}

function parseSQLValue(val: string): unknown {
  if (val.toUpperCase() === 'NULL') return null;
  if (val.toUpperCase() === 'TRUE') return true;
  if (val.toUpperCase() === 'FALSE') return false;
  const num = Number(val);
  if (!isNaN(num) && val !== '') return num;
  return val;
}

function parseJSON(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);
        const data = flattenJSON(raw);
        if (!data.length) throw new Error('No tabular data found in JSON.');
        resolve(data);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function flattenJSON(input: unknown): Record<string, unknown>[] {
  // If array of objects, flatten each
  if (Array.isArray(input)) {
    if (input.length === 0) return [];
    if (typeof input[0] === 'object' && input[0] !== null) {
      return input.map(item => flattenObject(item as Record<string, unknown>));
    }
    return input.map((v, i) => ({ index: i, value: v }));
  }
  // If object with array values, find the main array
  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0) {
        const arr = obj[key] as unknown[];
        if (typeof arr[0] === 'object' && arr[0] !== null) {
          return arr.map(item => flattenObject(item as Record<string, unknown>));
        }
      }
    }
    // Single object → single row
    return [flattenObject(obj)];
  }
  return [];
}

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'object') {
        result[newKey] = JSON.stringify(value);
      } else {
        result[newKey] = value.join(', ');
      }
    } else {
      result[newKey] = value;
    }
  }
  return result;
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

export function calculateCorrelation(data: Record<string, unknown>[], col1: string, col2: string): number {
  const pairs: [number, number][] = [];
  data.forEach(row => {
    const v1 = Number(row[col1]);
    const v2 = Number(row[col2]);
    if (!isNaN(v1) && !isNaN(v2)) pairs.push([v1, v2]);
  });
  if (pairs.length < 3) return 0;
  const n = pairs.length;
  const sumX = pairs.reduce((a, [x]) => a + x, 0);
  const sumY = pairs.reduce((a, [, y]) => a + y, 0);
  const sumXY = pairs.reduce((a, [x, y]) => a + x * y, 0);
  const sumX2 = pairs.reduce((a, [x]) => a + x * x, 0);
  const sumY2 = pairs.reduce((a, [, y]) => a + y * y, 0);
  const denom = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

export function getCorrelationMatrix(data: Record<string, unknown>[], numericColumns: string[]): { columns: string[]; matrix: number[][] } {
  const matrix = numericColumns.map(c1 =>
    numericColumns.map(c2 => c1 === c2 ? 1 : +calculateCorrelation(data, c1, c2).toFixed(2))
  );
  return { columns: numericColumns, matrix };
}
