/**
 * Power BI Intelligent Studio — Export Package
 * PBI-ready data, measures, M steps, data dictionary
 */

import type { DatasetAnalysis } from './dataProcessor';
import type { PowerBiDataModel, PbiMeasure } from './powerBiModel';

export interface PowerBiExportPackage {
  fileName: string;
  dataModel: PowerBiDataModel;
  measures: PbiMeasure[];
  mSteps: string;
  dataDictionary: string;
  instructions: string;
}

export function buildPowerBiExportPackage(
  analysis: DatasetAnalysis,
  model: PowerBiDataModel,
  measures: PbiMeasure[],
  fileName: string
): PowerBiExportPackage {
  return {
    fileName,
    dataModel: model,
    measures,
    mSteps: generatePowerQuerySteps(analysis),
    dataDictionary: generateDataDictionary(model, analysis),
    instructions: generateImportInstructions(fileName),
  };
}

function generatePowerQuerySteps(analysis: DatasetAnalysis): string {
  const typeList = analysis.columnInfo.map((col, i) => {
    const pbiType = col.type === 'numeric' ? 'Number.Type' : col.type === 'datetime' ? 'DateTime.Type' : 'Text.Type';
    return `    {"${col.name}", ${pbiType}}${i < analysis.columnInfo.length - 1 ? ',' : ''}`;
  }).join('\n');
  return `// Power Query (M) — Data cleaning pipeline
// Replace YOUR_FILE_PATH with actual path. Use Get Data > Excel/CSV first, then apply below.

let
  // Step 1: Get your source (adjust Csv.Document or Excel.Workbook as needed)
  Source = Csv.Document(File.Contents("YOUR_FILE_PATH"), [Delimiter=",", Columns=${analysis.columns}, Encoding=65001]),
  #"Promoted Headers" = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
  
  // Step 2: Set column types
  #"Changed Type" = Table.TransformColumnTypes(#"Promoted Headers", {
${typeList}
  }),
  
  // Step 3: Remove duplicates
  #"Removed Duplicates" = Table.Distinct(#"Changed Type")
in
  #"Removed Duplicates"`;
}

function generateDataDictionary(model: PowerBiDataModel, analysis: DatasetAnalysis): string {
  const lines: string[] = ['# Data Dictionary', ''];
  model.tables.forEach(t => {
    lines.push(`## ${t.name} (${t.role})`);
    lines.push('');
    t.columns.forEach(c => {
      lines.push(`- **${c.name}** — ${c.daxType} (${c.role || 'attribute'})`);
    });
    lines.push('');
  });
  lines.push('## Relationships');
  lines.push('');
  model.relationships.forEach(r => {
    lines.push(`- ${r.fromTable}[${r.fromColumn}] → ${r.toTable}[${r.toColumn}] (${r.cardinality})`);
  });
  return lines.join('\n');
}

function generateImportInstructions(fileName: string): string {
  return `# Import into Power BI Desktop

1. Open Power BI Desktop
2. Get Data → Excel/CSV → Select: ${fileName}
3. In Power Query Editor:
   - Apply the provided M script for cleaning (optional)
4. Create relationships per Data Dictionary
5. Copy DAX measures into New Measure
6. Build visuals using Fields pane

## Recommended Layout
- TOP: KPI Cards row
- MIDDLE: Line chart (trend), Comparison chart
- BOTTOM: Breakdown chart, Matrix, Slicer`;
}

/** Export measures as .txt file */
export function exportMeasuresTxt(measures: PbiMeasure[]): string {
  return measures.map(m => `${m.name} :=\n${m.expression}\n`).join('\n');
}
