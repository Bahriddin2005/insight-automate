import type { ColumnInfo, DatasetAnalysis } from './dataProcessor';

// ─── PYTHON CODE GENERATOR ───

export function generatePythonCode(analysis: DatasetAnalysis, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'csv';
  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric');
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical');
  const dateCols = analysis.columnInfo.filter(c => c.type === 'datetime');

  const loadLine = ext === 'csv'
    ? `df = pd.read_csv("${fileName}")`
    : `df = pd.read_excel("${fileName}")`;

  let code = `import pandas as pd
import numpy as np
import plotly.express as px

# ═══════════════════════════════════════
# DATA LOADING
# ═══════════════════════════════════════
${loadLine}
print(f"Loaded: {df.shape[0]} rows × {df.shape[1]} columns")

# ═══════════════════════════════════════
# DATA CLEANING PIPELINE
# ═══════════════════════════════════════

# 1. Trim whitespace in text columns
str_cols = df.select_dtypes(include='object').columns
df[str_cols] = df[str_cols].apply(lambda x: x.str.strip())

# 2. Remove exact duplicates
before = len(df)
df = df.drop_duplicates()
print(f"Duplicates removed: {before - len(df)}")

`;

  // Numeric conversion
  if (numCols.length > 0) {
    code += `# 3. Convert numeric strings\n`;
    numCols.forEach(c => {
      code += `df["${c.name}"] = pd.to_numeric(df["${c.name}"].astype(str).str.replace(",", ""), errors="coerce")\n`;
    });
    code += '\n';
  }

  // Date parsing
  if (dateCols.length > 0) {
    code += `# 4. Parse date columns\n`;
    dateCols.forEach(c => {
      code += `df["${c.name}"] = pd.to_datetime(df["${c.name}"], errors="coerce")\n`;
    });
    code += '\n';
  }

  // Missing value imputation
  code += `# 5. Handle missing values\n`;
  numCols.forEach(c => {
    code += `df["${c.name}"].fillna(df["${c.name}"].median(), inplace=True)  # median imputation\n`;
  });
  catCols.forEach(c => {
    code += `df["${c.name}"].fillna(df["${c.name}"].mode().iloc[0] if not df["${c.name}"].mode().empty else "", inplace=True)\n`;
  });

  // Outlier detection
  if (numCols.length > 0) {
    code += `
# 6. Outlier detection (IQR method)
def detect_outliers_iqr(series):
    Q1, Q3 = series.quantile(0.25), series.quantile(0.75)
    IQR = Q3 - Q1
    return ((series < Q1 - 1.5 * IQR) | (series > Q3 + 1.5 * IQR)).sum()

outlier_report = {col: detect_outliers_iqr(df[col]) for col in [${numCols.map(c => `"${c.name}"`).join(', ')}]}
print("Outliers:", outlier_report)
`;
  }

  // Quality score
  code += `
# ═══════════════════════════════════════
# DATA QUALITY SCORE
# ═══════════════════════════════════════
missing_ratio = df.isnull().mean().mean() * 100
dup_ratio = (${analysis.duplicatesRemoved} / ${analysis.rawRowCount}) * 100
quality_score = max(0, min(100, round(100 - (missing_ratio * 0.4 + dup_ratio * 0.3))))
print(f"Data Quality Score: {quality_score}/100")

# ═══════════════════════════════════════
# SUMMARY STATISTICS
# ═══════════════════════════════════════
print(df.describe())
`;

  // Visualizations
  if (numCols.length > 0) {
    const c = numCols[0];
    code += `
# ═══════════════════════════════════════
# VISUALIZATIONS
# ═══════════════════════════════════════

# Histogram
fig = px.histogram(df, x="${c.name}", title="Distribution of ${c.name}", template="plotly_dark")
fig.show()
`;
  }

  if (catCols.length > 0) {
    const c = catCols[0];
    code += `
# Top 10 categories
top10 = df["${c.name}"].value_counts().head(10).reset_index()
top10.columns = ["${c.name}", "count"]
fig = px.bar(top10, x="${c.name}", y="count", title="Top 10 — ${c.name}", template="plotly_dark")
fig.show()
`;
  }

  if (dateCols.length > 0 && numCols.length > 0) {
    code += `
# Time series
ts = df.groupby(df["${dateCols[0].name}"].dt.to_period("M"))["${numCols[0].name}"].sum().reset_index()
ts["${dateCols[0].name}"] = ts["${dateCols[0].name}"].astype(str)
fig = px.line(ts, x="${dateCols[0].name}", y="${numCols[0].name}", title="Trend over Time", template="plotly_dark")
fig.show()
`;
  }

  if (numCols.length >= 2) {
    code += `
# Correlation heatmap
import plotly.figure_factory as ff
corr = df[[${numCols.map(c => `"${c.name}"`).join(', ')}]].corr()
fig = px.imshow(corr, text_auto=True, title="Correlation Heatmap", template="plotly_dark")
fig.show()
`;
  }

  // Missing values chart
  code += `
# Missing values visualization
missing = df.isnull().sum().reset_index()
missing.columns = ["column", "missing_count"]
missing = missing[missing["missing_count"] > 0]
if not missing.empty:
    fig = px.bar(missing, x="column", y="missing_count", title="Missing Values by Column", template="plotly_dark")
    fig.show()

# ═══════════════════════════════════════
# EXPORT CLEANED DATA
# ═══════════════════════════════════════
df.to_csv("cleaned_${fileName.replace(/\.\w+$/, '')}.csv", index=False)
print("Cleaned data exported!")
`;

  return code;
}

// ─── SQL QUERY GENERATOR ───

export function generateSQLQueries(analysis: DatasetAnalysis, fileName: string, dialect: 'ansi' | 'postgresql' | 'mysql' | 'sqlserver' = 'ansi'): string {
  const table = fileName.replace(/\.\w+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric');
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical');
  const dateCols = analysis.columnInfo.filter(c => c.type === 'datetime');

  const limit = dialect === 'sqlserver' ? 'TOP 10' : '';
  const limitEnd = dialect === 'sqlserver' ? '' : '\nLIMIT 10';
  const topSelect = dialect === 'sqlserver' ? `SELECT TOP 10` : `SELECT`;

  let sql = `-- ═══════════════════════════════════════
-- SQL Analytics Queries for: ${table}
-- Dialect: ${dialect.toUpperCase()}
-- ═══════════════════════════════════════

-- 1. Row count & basic KPIs
SELECT
  COUNT(*) AS total_rows,
  ${numCols.map(c => `AVG(${c.name}) AS avg_${c.name}`).join(',\n  ') || "'no_numeric_cols'"}
FROM ${table};

`;

  // Missing count per column
  sql += `-- 2. Missing values per column\nSELECT\n`;
  sql += analysis.columnInfo.map(c =>
    `  SUM(CASE WHEN ${c.name} IS NULL THEN 1 ELSE 0 END) AS missing_${c.name}`
  ).join(',\n');
  sql += `\nFROM ${table};\n\n`;

  // Group by categorical
  catCols.forEach(c => {
    sql += `-- Top 10 by ${c.name}\n${topSelect}\n  ${c.name},\n  COUNT(*) AS cnt`;
    if (numCols.length > 0) sql += `,\n  SUM(${numCols[0].name}) AS total_${numCols[0].name}`;
    sql += `\nFROM ${table}\nGROUP BY ${c.name}\nORDER BY cnt DESC${limitEnd};\n\n`;
  });

  // Time aggregation
  if (dateCols.length > 0) {
    const dc = dateCols[0].name;
    let dateGroup: string;
    if (dialect === 'postgresql') dateGroup = `DATE_TRUNC('month', ${dc})`;
    else if (dialect === 'mysql') dateGroup = `DATE_FORMAT(${dc}, '%Y-%m')`;
    else if (dialect === 'sqlserver') dateGroup = `FORMAT(${dc}, 'yyyy-MM')`;
    else dateGroup = `EXTRACT(YEAR FROM ${dc}) || '-' || EXTRACT(MONTH FROM ${dc})`;

    sql += `-- Time series aggregation (monthly)\nSELECT\n  ${dateGroup} AS month,\n  COUNT(*) AS record_count`;
    if (numCols.length > 0) sql += `,\n  SUM(${numCols[0].name}) AS total_${numCols[0].name}`;
    sql += `\nFROM ${table}\nGROUP BY ${dateGroup}\nORDER BY month;\n\n`;
  }

  // Numeric stats
  numCols.forEach(c => {
    sql += `-- Statistics for ${c.name}\nSELECT\n  MIN(${c.name}) AS min_val,\n  MAX(${c.name}) AS max_val,\n  AVG(${c.name}) AS avg_val,\n  COUNT(${c.name}) AS non_null_count\nFROM ${table};\n\n`;
  });

  return sql;
}

// ─── POWER BI GUIDE GENERATOR ───

export function generatePowerBIGuide(analysis: DatasetAnalysis, fileName: string): string {
  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric');
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical');
  const dateCols = analysis.columnInfo.filter(c => c.type === 'datetime');

  let guide = `// ═══════════════════════════════════════
// POWER BI GUIDE — ${fileName}
// ═══════════════════════════════════════

// ─── POWER QUERY (M) — Data Cleaning Steps ───

let
    // Step 1: Load source
    Source = ${fileName.endsWith('.csv')
      ? `Csv.Document(File.Contents("${fileName}"), [Delimiter=",", Encoding=65001])`
      : `Excel.Workbook(File.Contents("${fileName}"), null, true)`
    },

    // Step 2: Promote headers
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),

    // Step 3: Trim whitespace
    TrimmedText = Table.TransformColumns(PromotedHeaders,
        List.Transform(Table.ColumnNames(PromotedHeaders), each {_, Text.Trim, type text})
    ),

    // Step 4: Remove duplicates
    RemovedDuplicates = Table.Distinct(TrimmedText),

`;

  // Type changes
  const typeChanges: string[] = [];
  numCols.forEach(c => typeChanges.push(`{"${c.name}", type number}`));
  dateCols.forEach(c => typeChanges.push(`{"${c.name}", type datetime}`));
  catCols.forEach(c => typeChanges.push(`{"${c.name}", type text}`));

  if (typeChanges.length > 0) {
    guide += `    // Step 5: Change column types
    ChangedTypes = Table.TransformColumnTypes(RemovedDuplicates, {
        ${typeChanges.join(',\n        ')}
    }),

`;
  }

  // Missing value handling
  if (numCols.length > 0) {
    guide += `    // Step 6: Replace nulls in numeric columns (median approach — manual)
    // Power Query doesn't have a built-in median fill, so use Table.ReplaceValue:
`;
    numCols.forEach(c => {
      const med = c.stats?.median ?? 0;
      guide += `    Filled_${c.name.replace(/\W/g, '_')} = Table.ReplaceValue(${typeChanges.length > 0 ? 'ChangedTypes' : 'RemovedDuplicates'}, null, ${med}, Replacer.ReplaceValue, {"${c.name}"}),\n`;
    });
  }

  guide += `
    // Final result
    Result = ${numCols.length > 0 ? `Filled_${numCols[numCols.length - 1].name.replace(/\W/g, '_')}` : typeChanges.length > 0 ? 'ChangedTypes' : 'RemovedDuplicates'}
in
    Result


// ─── SUGGESTED DATA MODEL ───
`;

  if (dateCols.length > 0) {
    guide += `
// Star Schema Recommendation:
//   ┌─────────────┐     ┌────────────┐
//   │ Date Table  │────▶│ Fact Table │
//   │ (Calendar)  │     │ (${fileName.replace(/\.\w+$/, '')})  │
//   └─────────────┘     └────────────┘
//
// Create a separate Date table for time intelligence:
//   DateTable = CALENDARAUTO()
//   Add: Year, Month, Quarter, WeekDay columns
`;
  }

  guide += `

// ─── DAX MEASURES ───

// Total Rows
Total Rows = COUNTROWS('${fileName.replace(/\.\w+$/, '')}')

`;

  numCols.forEach(c => {
    guide += `// Total ${c.name}\nTotal ${c.name} = SUM('${fileName.replace(/\.\w+$/, '')}'[${c.name}])\n\n`;
    guide += `// Average ${c.name}\nAvg ${c.name} = AVERAGE('${fileName.replace(/\.\w+$/, '')}'[${c.name}])\n\n`;
  });

  if (dateCols.length > 0 && numCols.length > 0) {
    const metric = numCols[0].name;
    guide += `// Month-over-Month Growth
MoM Growth % =
VAR CurrentMonth = [Total ${metric}]
VAR PreviousMonth =
    CALCULATE(
        [Total ${metric}],
        DATEADD('DateTable'[Date], -1, MONTH)
    )
RETURN
    IF(PreviousMonth <> 0,
        DIVIDE(CurrentMonth - PreviousMonth, PreviousMonth) * 100,
        BLANK()
    )

`;
  }

  // Data Quality Score DAX
  guide += `// Data Quality Score (approximate)
Data Quality Score =
VAR MissingRatio = ${analysis.missingPercent.toFixed(2)} / 100
VAR DupRatio = ${((analysis.duplicatesRemoved / analysis.rawRowCount) * 100).toFixed(2)} / 100
RETURN MAX(0, MIN(100, 100 - (MissingRatio * 40 + DupRatio * 30)))
`;

  return guide;
}
