/**
 * Enterprise Analytics Studio — Data Connectors
 * SQL, API endpoints with auth, pagination, schema tracking
 */

import type { ColumnInfo } from './dataProcessor';

export type ConnectorType = 'csv' | 'xlsx' | 'json' | 'sql' | 'api' | 'postgres' | 'mysql';

export interface ConnectorAuth {
  type: 'none' | 'bearer' | 'api_key' | 'basic';
  token?: string;
  apiKey?: string;
  apiKeyHeader?: string;
  username?: string;
  password?: string;
}

export interface ApiConnectorConfig {
  url: string;
  method?: 'GET' | 'POST';
  auth?: ConnectorAuth;
  headers?: Record<string, string>;
  pagination?: {
    type: 'offset' | 'cursor';
    limitParam?: string;
    offsetParam?: string;
    cursorParam?: string;
    pageSize?: number;
  };
  rateLimit?: {
    requestsPerMinute?: number;
    delayBetweenRequests?: number;
  };
}

export interface SqlConnectorConfig {
  type: 'postgres' | 'mysql';
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  query: string;
  ssl?: boolean;
}

export interface IngestionMetadata {
  sourceType: ConnectorType;
  ingestedAt: string;
  schemaVersion?: number;
  rowCount: number;
  columnCount: number;
  freshnessTimestamp?: string;
}

/** Flatten nested JSON to flat rows */
export function flattenNestedJson(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      Object.assign(result, flattenNestedJson(v as Record<string, unknown>, key));
    } else {
      result[key] = v;
    }
  }
  return result;
}

/** Detect schema from sample rows */
export function detectSchemaFromRows(rows: Record<string, unknown>[]): ColumnInfo[] {
  if (!rows.length) return [];
  const sample = rows.slice(0, 100);
  const columns: ColumnInfo[] = [];
  const keys = new Set<string>();
  sample.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
  keys.forEach(name => {
    const vals = sample.map(r => r[name]).filter(v => v != null && v !== '');
    const strVals = vals.map(v => String(v));
    const numVals = vals.map(v => Number(v)).filter(n => !isNaN(n));
    const dateVals = vals.map(v => new Date(String(v))).filter(d => !isNaN(d.getTime()));
    let type: ColumnInfo['type'] = 'text';
    if (numVals.length === vals.length && vals.length > 0) type = 'numeric';
    else if (dateVals.length > vals.length * 0.5) type = 'datetime';
    else if (strVals.every(s => /^\d+$/.test(s)) && vals.length > 0) type = 'id';
    else if (strVals.length <= 20 || new Set(strVals).size < Math.min(20, vals.length)) type = 'categorical';
    columns.push({
      name,
      type,
      missingCount: sample.length - vals.length,
      missingPercent: ((sample.length - vals.length) / sample.length) * 100,
      uniqueCount: new Set(strVals).size,
    });
  });
  return columns;
}
