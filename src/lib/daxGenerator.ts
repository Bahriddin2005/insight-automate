/**
 * Power BI Intelligent Studio — DAX Measure Generator
 * Generates DAX-equivalent measures from dataset analysis
 */

import type { DatasetAnalysis } from './dataProcessor';
import type { PowerBiDataModel, PbiMeasure } from './powerBiModel';

export function generateDaxMeasures(analysis: DatasetAnalysis, model: PowerBiDataModel): PbiMeasure[] {
  const factTable = model.tables.find(t => t.role === 'fact')!;
  const numCols = factTable.columns.filter(c => c.type === 'numeric' && c.role === 'measure');

  const measures: PbiMeasure[] = [];

  numCols.forEach(col => {
    measures.push({
      name: `Total ${col.name}`,
      expression: `SUM(${factTable.name}[${col.name}])`,
      format: '0.00',
      description: `Sum of ${col.name}`,
    });
    measures.push({
      name: `Average ${col.name}`,
      expression: `AVERAGE(${factTable.name}[${col.name}])`,
      format: '0.00',
    });
    measures.push({
      name: `${col.name} Count`,
      expression: `COUNT(${factTable.name}[${col.name}])`,
      format: '0',
    });
  });

  // Profit / Margin (if revenue + cost exist)
  const revCol = numCols.find(c => /revenue|sales|amount|income/i.test(c.name));
  const costCol = numCols.find(c => /cost|expense|spend/i.test(c.name));
  if (revCol && costCol) {
    measures.push({
      name: 'Profit',
      expression: `[Total ${revCol.name}] - [Total ${costCol.name}]`,
      format: '0.00',
    });
    measures.push({
      name: 'Profit Margin %',
      expression: `DIVIDE([Profit], [Total ${revCol.name}], 0) * 100`,
      format: '0.00%',
    });
  }

  // Time Intelligence (if date exists)
  const dateCol = factTable.dateColumn || analysis.columnInfo.find(c => c.type === 'datetime')?.name;
  if (dateCol && revCol) {
    const revMeasure = `Total ${revCol.name}`;
    measures.push({
      name: 'YoY Growth %',
      expression: `DIVIDE(
  [${revMeasure}] - CALCULATE([${revMeasure}], SAMEPERIODLASTYEAR(${model.dateIntelligence.table}[${model.dateIntelligence.dateColumn}])),
  CALCULATE([${revMeasure}], SAMEPERIODLASTYEAR(${model.dateIntelligence.table}[${model.dateIntelligence.dateColumn}])),
  0
) * 100`,
      format: '0.0%',
    });
    measures.push({
      name: 'MoM Growth %',
      expression: `DIVIDE(
  [${revMeasure}] - CALCULATE([${revMeasure}], DATEADD(${model.dateIntelligence.table}[${model.dateIntelligence.dateColumn}], -1, MONTH)),
  CALCULATE([${revMeasure}], DATEADD(${model.dateIntelligence.table}[${model.dateIntelligence.dateColumn}], -1, MONTH)),
  0
) * 100`,
      format: '0.0%',
    });
    measures.push({
      name: 'YTD Total',
      expression: `TOTALYTD([${revMeasure}], ${model.dateIntelligence.table}[${model.dateIntelligence.dateColumn}])`,
      format: '0.00',
    });
  }

  // Distinct count (for user/customer)
  const idCol = factTable.columns.find(c => /user|customer|client|id/i.test(c.name));
  if (idCol) {
    measures.push({
      name: 'Unique Count',
      expression: `DISTINCTCOUNT(${factTable.name}[${idCol.name}])`,
      format: '0',
    });
  }

  return dedupeMeasures(measures);
}

function dedupeMeasures(measures: PbiMeasure[]): PbiMeasure[] {
  const seen = new Set<string>();
  return measures.filter(m => {
    const k = m.name;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
