/**
 * Power BI Intelligent Studio — Data Model
 * Star schema, fact/dimension detection, relationships
 */

import type { ColumnInfo, DatasetAnalysis } from './dataProcessor';

export type PbiTableRole = 'fact' | 'dimension' | 'date';

export interface PbiColumn {
  name: string;
  type: 'numeric' | 'categorical' | 'datetime' | 'text' | 'id';
  daxType: 'INTEGER' | 'REAL' | 'STRING' | 'BOOLEAN' | 'DATETIME';
  role?: 'measure' | 'key' | 'attribute' | 'date_key';
  stats?: ColumnInfo['stats'];
  topValues?: { value: string; count: number }[];
}

export interface PbiTable {
  name: string;
  role: PbiTableRole;
  columns: PbiColumn[];
  rowCount: number;
  keyColumn?: string;
  dateColumn?: string;
}

export interface PbiRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  cardinality: 'many' | 'one';
  crossFilter?: 'both' | 'single';
}

export interface PbiMeasure {
  name: string;
  expression: string;
  format?: string;
  description?: string;
}

export interface PowerBiDataModel {
  tables: PbiTable[];
  relationships: PbiRelationship[];
  measures: PbiMeasure[];
  dateIntelligence: { table: string; dateColumn: string };
}

const ID_NAMES = ['id', 'key', '_id', 'code', 'sku', 'productid', 'userid', 'customerid'];

function toDaxType(col: ColumnInfo): PbiColumn['daxType'] {
  switch (col.type) {
    case 'numeric': return 'REAL';
    case 'datetime': return 'DATETIME';
    case 'id': return 'INTEGER';
    default: return 'STRING';
  }
}

function isKeyColumn(col: ColumnInfo): boolean {
  const n = col.name.toLowerCase();
  if (col.type === 'id') return true;
  if (ID_NAMES.some(x => n.includes(x))) return true;
  return false;
}

export function buildPowerBiModel(analysis: DatasetAnalysis): PowerBiDataModel {
  const factTable = buildFactTable(analysis);
  const dimTables = buildDimensionTables(analysis);
  const dateTable = buildDateDimension(analysis);
  const relationships = buildRelationships(factTable, dateTable);
  return {
    tables: [factTable, ...dimTables, dateTable],
    relationships,
    measures: [],
    dateIntelligence: { table: dateTable.name, dateColumn: dateTable.dateColumn ?? 'Date' },
  };
}

function buildFactTable(analysis: DatasetAnalysis): PbiTable {
  const dateCol = analysis.columnInfo.find(c => c.type === 'datetime');
  const columns: PbiColumn[] = analysis.columnInfo.map(col => ({
    name: col.name,
    type: col.type,
    daxType: toDaxType(col),
    role: col.type === 'numeric' ? 'measure' : isKeyColumn(col) ? 'key' : 'attribute',
    stats: col.stats,
    topValues: col.topValues,
  }));
  return {
    name: 'FactTable',
    role: 'fact',
    columns,
    rowCount: analysis.rows,
    dateColumn: dateCol?.name,
  };
}

function buildDimensionTables(analysis: DatasetAnalysis): PbiTable[] {
  const dims: PbiTable[] = [];
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical');
  if (!catCols.length) return dims;
  const productCol = catCols.find(c => /product|item|sku/i.test(c.name)) ?? catCols[0];
  dims.push({
    name: 'DimProduct',
    role: 'dimension',
    columns: [
      { name: productCol.name + '_Key', type: 'id', daxType: 'INTEGER', role: 'key' },
      { name: productCol.name, type: 'categorical', daxType: 'STRING', role: 'attribute', topValues: productCol.topValues },
    ],
    rowCount: productCol.uniqueCount,
    keyColumn: productCol.name + '_Key',
  });
  const regionCol = catCols.find(c => /region|country|city/i.test(c.name));
  if (regionCol && regionCol !== productCol) {
    dims.push({
      name: 'DimRegion',
      role: 'dimension',
      columns: [
        { name: regionCol.name + '_Key', type: 'id', daxType: 'INTEGER', role: 'key' },
        { name: regionCol.name, type: 'categorical', daxType: 'STRING', role: 'attribute', topValues: regionCol.topValues },
      ],
      rowCount: regionCol.uniqueCount,
      keyColumn: regionCol.name + '_Key',
    });
  }
  return dims;
}

function buildDateDimension(analysis: DatasetAnalysis): PbiTable {
  return {
    name: 'DimDate',
    role: 'date',
    columns: [
      { name: 'Date', type: 'datetime', daxType: 'DATETIME', role: 'date_key' },
      { name: 'Year', type: 'numeric', daxType: 'INTEGER', role: 'attribute' },
      { name: 'Month', type: 'numeric', daxType: 'INTEGER', role: 'attribute' },
      { name: 'Quarter', type: 'numeric', daxType: 'INTEGER', role: 'attribute' },
      { name: 'MonthName', type: 'categorical', daxType: 'STRING', role: 'attribute' },
    ],
    rowCount: 0,
    dateColumn: 'Date',
  };
}

function buildRelationships(fact: PbiTable, dateTable: PbiTable): PbiRelationship[] {
  const rels: PbiRelationship[] = [];
  if (fact.dateColumn) {
    rels.push({
      fromTable: fact.name,
      fromColumn: fact.dateColumn,
      toTable: dateTable.name,
      toColumn: 'Date',
      cardinality: 'one',
      crossFilter: 'single',
    });
  }
  return rels;
}
