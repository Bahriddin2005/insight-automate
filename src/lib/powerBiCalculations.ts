/**
 * Power BI Intelligent Studio — Calculation Engine
 * High-precision aggregations with filter context (DAX-like)
 */

import type { DatasetAnalysis } from './dataProcessor';

export interface FilterContext {
  /** Column → selected values (empty = all) */
  slicers: Record<string, unknown[]>;
  /** Column → [min, max] */
  dateRange?: { column: string; min: string; max: string };
  /** Column → [min, max] */
  numericRange?: Record<string, [number, number]>;
}

/** Apply filter context to data */
export function filterData(data: Record<string, unknown>[], filters: FilterContext): Record<string, unknown>[] {
  return data.filter(row => {
    for (const [col, vals] of Object.entries(filters.slicers)) {
      if (vals.length === 0) continue;
      const v = row[col];
      if (!vals.some(x => String(x) === String(v))) return false;
    }
    if (filters.dateRange) {
      const d = new Date(String(row[filters.dateRange.column]));
      if (!isNaN(d.getTime())) {
        if (filters.dateRange.min && d < new Date(filters.dateRange.min)) return false;
        if (filters.dateRange.max && d > new Date(filters.dateRange.max + 'T23:59:59')) return false;
      }
    }
    if (filters.numericRange) {
      for (const [col, [min, max]] of Object.entries(filters.numericRange)) {
        const v = Number(row[col]);
        if (!isNaN(v) && (v < min || v > max)) return false;
      }
    }
    return true;
  });
}

/** SUM aggregation */
export function sumFiltered(data: Record<string, unknown>[], column: string, filters?: FilterContext): number {
  const filtered = filters ? filterData(data, filters) : data;
  return filtered.reduce((a, r) => a + (Number(r[column]) || 0), 0);
}

/** AVERAGE aggregation */
export function avgFiltered(data: Record<string, unknown>[], column: string, filters?: FilterContext): number {
  const filtered = filters ? filterData(data, filters) : data;
  const vals = filtered.map(r => Number(r[column])).filter(n => !isNaN(n));
  return vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : 0;
}

/** COUNT aggregation */
export function countFiltered(data: Record<string, unknown>[], column: string, filters?: FilterContext): number {
  const filtered = filters ? filterData(data, filters) : data;
  return filtered.filter(r => r[column] != null && r[column] !== '').length;
}

/** DISTINCTCOUNT aggregation */
export function distinctCountFiltered(data: Record<string, unknown>[], column: string, filters?: FilterContext): number {
  const filtered = filters ? filterData(data, filters) : data;
  const set = new Set(filtered.map(r => String(r[column] ?? '')));
  return set.size;
}

/** MoM growth % */
export function momGrowth(data: Record<string, unknown>[], valueCol: string, dateCol: string, filters?: FilterContext): number {
  const filtered = filters ? filterData(data, filters) : data;
  const byMonth: Record<string, number> = {};
  filtered.forEach(row => {
    const d = new Date(String(row[dateCol]));
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth[key] = (byMonth[key] || 0) + (Number(row[valueCol]) || 0);
  });
  const keys = Object.keys(byMonth).sort();
  if (keys.length < 2) return 0;
  const curr = byMonth[keys[keys.length - 1]];
  const prev = byMonth[keys[keys.length - 2]];
  return prev ? ((curr - prev) / prev) * 100 : 0;
}

/** YTD sum */
export function ytdSum(data: Record<string, unknown>[], valueCol: string, dateCol: string, filters?: FilterContext): number {
  const filtered = filters ? filterData(data, filters) : data;
  const now = new Date();
  const thisYear = now.getFullYear();
  return filtered.reduce((a, r) => {
    const d = new Date(String(r[dateCol]));
    const v = Number(r[valueCol]);
    if (isNaN(d.getTime()) || isNaN(v) || d.getFullYear() !== thisYear) return a;
    if (d > now) return a;
    return a + v;
  }, 0);
}
