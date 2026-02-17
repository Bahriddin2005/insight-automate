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

  // ─── FILTERING ───
  code += `
# ═══════════════════════════════════════
# DATA FILTERING & SLICING
# ═══════════════════════════════════════
`;
  if (numCols.length > 0) {
    const nc = numCols[0];
    code += `
# Filter by numeric range
df_filtered = df[df["${nc.name}"] > df["${nc.name}"].median()]
print(f"Rows above median ${nc.name}: {len(df_filtered)}")
`;
  }
  if (catCols.length > 0) {
    const cc = catCols[0];
    code += `
# Filter by category
top_categories = df["${cc.name}"].value_counts().head(5).index.tolist()
df_top = df[df["${cc.name}"].isin(top_categories)]
print(f"Rows in top 5 ${cc.name}: {len(df_top)}")
`;
  }
  if (dateCols.length > 0) {
    code += `
# Filter by date range
df["${dateCols[0].name}"] = pd.to_datetime(df["${dateCols[0].name}"], errors="coerce")
latest = df["${dateCols[0].name}"].max()
df_recent = df[df["${dateCols[0].name}"] >= latest - pd.Timedelta(days=30)]
print(f"Rows in last 30 days: {len(df_recent)}")
`;
  }

  // ─── GROUPBY ANALYSIS ───
  code += `
# ═══════════════════════════════════════
# GROUP BY ANALYSIS
# ═══════════════════════════════════════
`;
  if (catCols.length > 0 && numCols.length > 0) {
    const cc = catCols[0];
    const nc = numCols[0];
    code += `
# Group by ${cc.name} — aggregate ${nc.name}
grouped = df.groupby("${cc.name}")["${nc.name}"].agg(["sum", "mean", "count", "std"])
grouped = grouped.sort_values("sum", ascending=False).head(10)
print("\\nGrouped Analysis:")
print(grouped)

# Pivot table
`;
    if (dateCols.length > 0) {
      code += `pivot = pd.pivot_table(df, values="${nc.name}", index="${cc.name}",
                        columns=df["${dateCols[0].name}"].dt.month, aggfunc="sum", fill_value=0)
print("\\nPivot Table (${cc.name} × Month):")
print(pivot.head(10))
`;
    }
  }

  // ─── ADVANCED ANALYSIS ───
  code += `
# ═══════════════════════════════════════
# ADVANCED DATA ANALYSIS
# ═══════════════════════════════════════
`;
  if (numCols.length >= 2) {
    code += `
# Correlation analysis
correlation = df[[${numCols.map(c => `"${c.name}"`).join(', ')}]].corr()
print("\\nCorrelation Matrix:")
print(correlation.round(3))

# Top correlated pairs
import itertools
pairs = list(itertools.combinations([${numCols.map(c => `"${c.name}"`).join(', ')}], 2))
corr_pairs = [(a, b, correlation.loc[a, b]) for a, b in pairs]
corr_pairs.sort(key=lambda x: abs(x[2]), reverse=True)
print("\\nStrongest correlations:")
for a, b, r in corr_pairs[:5]:
    print(f"  {a} ↔ {b}: {r:.3f}")
`;
  }

  if (dateCols.length > 0 && numCols.length > 0) {
    const nc = numCols[0];
    const dc = dateCols[0];
    code += `
# Rolling averages & growth rate
ts = df.groupby(df["${dc.name}"].dt.to_period("M"))["${nc.name}"].sum().reset_index()
ts["${dc.name}"] = ts["${dc.name}"].astype(str)
ts["rolling_3m"] = ts["${nc.name}"].rolling(3).mean()
ts["growth_rate"] = ts["${nc.name}"].pct_change() * 100
print("\\nMonthly Trend with Growth Rate:")
print(ts.tail(12))
`;
  }

  if (catCols.length > 0) {
    code += `
# Pareto analysis (80/20 rule)
pareto = df["${catCols[0].name}"].value_counts().reset_index()
pareto.columns = ["${catCols[0].name}", "count"]
pareto["cumulative_pct"] = (pareto["count"].cumsum() / pareto["count"].sum() * 100).round(1)
pareto_80 = pareto[pareto["cumulative_pct"] <= 80]
print(f"\\nPareto: {len(pareto_80)} out of {len(pareto)} categories make up 80% of data")
`;
  }

  // ─── VISUALIZATIONS ───
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
# Time series with rolling average
ts = df.groupby(df["${dateCols[0].name}"].dt.to_period("M"))["${numCols[0].name}"].sum().reset_index()
ts["${dateCols[0].name}"] = ts["${dateCols[0].name}"].astype(str)
ts["rolling_avg"] = ts["${numCols[0].name}"].rolling(3).mean()
fig = px.line(ts, x="${dateCols[0].name}", y=["${numCols[0].name}", "rolling_avg"],
              title="Trend with Rolling Average", template="plotly_dark")
fig.show()
`;
  }

  if (numCols.length >= 2) {
    code += `
# Correlation heatmap
corr = df[[${numCols.map(c => `"${c.name}"`).join(', ')}]].corr()
fig = px.imshow(corr, text_auto=True, title="Correlation Heatmap", template="plotly_dark",
                color_continuous_scale="Tealgrn")
fig.show()

# Scatter plot — top 2 correlated
fig = px.scatter(df, x="${numCols[0].name}", y="${numCols[1].name}",
                 ${catCols.length > 0 ? `color="${catCols[0].name}",` : ''}
                 title="${numCols[0].name} vs ${numCols[1].name}", template="plotly_dark")
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

// ─── R CODE GENERATOR ───

export function generateRCode(analysis: DatasetAnalysis, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'csv';
  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric');
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical');
  const dateCols = analysis.columnInfo.filter(c => c.type === 'datetime');

  const loadFn = ext === 'csv' ? 'read.csv' : 'readxl::read_excel';
  const loadArg = ext === 'csv' ? `"${fileName}", stringsAsFactors = FALSE` : `"${fileName}"`;

  let code = `# ═══════════════════════════════════════
# R Statistical Analysis — ${fileName}
# Requires: tidyverse, dplyr, ggplot2, lubridate
# install.packages(c("tidyverse", "readxl"))
# ═══════════════════════════════════════

library(tidyverse)

# ═══════════════════════════════════════
# DATA LOADING
# ═══════════════════════════════════════
df <- ${loadFn}(${loadArg})
cat("Loaded:", nrow(df), "rows ×", ncol(df), "columns\\n")

# ═══════════════════════════════════════
# DATA CLEANING PIPELINE
# ═══════════════════════════════════════

# 1. Trim whitespace in character columns
df <- df %>% mutate(across(where(is.character), ~ trimws(.)))

# 2. Remove exact duplicates
before <- nrow(df)
df <- df %>% distinct()
cat("Duplicates removed:", before - nrow(df), "\\n")

`;

  if (numCols.length > 0) {
    code += `# 3. Convert numeric columns\n`;
    numCols.forEach(c => {
      code += `df$"${c.name}" <- as.numeric(gsub(",", "", as.character(df$"${c.name}")))\n`;
    });
    code += '\n';
  }

  if (dateCols.length > 0) {
    code += `# 4. Parse date columns\n`;
    dateCols.forEach(c => {
      code += `df$"${c.name}" <- as.Date(df$"${c.name}")\n`;
    });
    code += '\n';
  }

  code += `# 5. Handle missing values\n`;
  numCols.forEach(c => {
    code += `df$"${c.name}"[is.na(df$"${c.name}")] <- median(df$"${c.name}", na.rm = TRUE)\n`;
  });
  catCols.forEach(c => {
    code += `df$"${c.name}"[is.na(df$"${c.name}")] <- names(sort(table(df$"${c.name}"), decreasing = TRUE))[1]\n`;
  });

  if (numCols.length > 0) {
    code += `
# 6. Outlier detection (IQR method)
detect_outliers_iqr <- function(x) {
  q <- quantile(x, c(0.25, 0.75), na.rm = TRUE)
  iqr <- q[2] - q[1]
  sum(x < q[1] - 1.5*iqr | x > q[2] + 1.5*iqr, na.rm = TRUE)
}
outlier_report <- sapply(df[c(${numCols.map(c => `"${c.name}"`).join(', ')}], detect_outliers_iqr)
print("Outliers:"); print(outlier_report)
`;
  }

  code += `
# ═══════════════════════════════════════
# SUMMARY STATISTICS
# ═══════════════════════════════════════
summary(df)

# ═══════════════════════════════════════
# DATA FILTERING & SLICING
# ═══════════════════════════════════════
`;

  if (numCols.length > 0) {
    const nc = numCols[0];
    code += `
# Filter by numeric range
df_filtered <- df %>% filter(.data[["${nc.name}"]] > median(.data[["${nc.name}"]], na.rm = TRUE))
cat("Rows above median ${nc.name}:", nrow(df_filtered), "\\n")
`;
  }
  if (catCols.length > 0) {
    const cc = catCols[0];
    code += `
# Filter by category
top_cats <- names(sort(table(df$"${cc.name}"), decreasing = TRUE))[1:5]
df_top <- df %>% filter(.data[["${cc.name}"]] %in% top_cats)
cat("Rows in top 5 ${cc.name}:", nrow(df_top), "\\n")
`;
  }

  code += `
# ═══════════════════════════════════════
# STATISTICAL ANALYSIS
# ═══════════════════════════════════════
`;
  if (numCols.length >= 2) {
    code += `
# Correlation analysis
cor_matrix <- cor(df[c(${numCols.map(c => `"${c.name}"`).join(', ')}], use = "complete.obs")
print("Correlation Matrix:"); print(round(cor_matrix, 3))

# Shapiro-Wilk normality test (sample)
if (nrow(df) >= 3 && nrow(df) <= 5000) {
  shapiro <- shapiro.test(sample(df$"${numCols[0].name}", min(5000, nrow(df))))
  cat("\\nShapiro-Wilk test (${numCols[0].name}): p =", shapiro$p.value, "\\n")
}
`;
  }

  if (catCols.length > 0 && numCols.length > 0) {
    const cc = catCols[0];
    const nc = numCols[0];
    code += `
# ANOVA / Kruskal-Wallis (group differences)
if (length(unique(df$"${cc.name}")) >= 2) {
  col_num <- "${nc.name}"
  col_cat <- "${cc.name}"
  fml <- as.formula(paste0(col_num, " ~ ", col_cat))
  kw <- kruskal.test(fml, data = df)
  cat("\\nKruskal-Wallis test:", kw$p.value, "\\n")
}
`;
  }

  code += `
# ═══════════════════════════════════════
# VISUALIZATIONS (ggplot2)
# ═══════════════════════════════════════
`;
  if (numCols.length > 0) {
    const c = numCols[0];
    code += `
# Histogram
ggplot(df, aes(x = .data[["${c.name}"]])) +
  geom_histogram(fill = "steelblue", bins = 30) +
  theme_minimal() +
  labs(title = "Distribution of ${c.name}")
`;
  }
  if (catCols.length > 0) {
    const c = catCols[0];
    code += `
# Bar chart — Top 10 categories
df %>% count(.data[["${c.name}"]], sort = TRUE) %>% head(10) %>%
  ggplot(aes(x = reorder(.data[["${c.name}"]], n), y = n)) +
  geom_col(fill = "steelblue") + coord_flip() +
  theme_minimal() + labs(title = "Top 10 — ${c.name}")
`;
  }
  if (numCols.length >= 2) {
    code += `
# Scatter plot
ggplot(df, aes(x = .data[["${numCols[0].name}"]], y = .data[["${numCols[1].name}"]])) +
  geom_point(alpha = 0.5) + theme_minimal() +
  labs(title = "${numCols[0].name} vs ${numCols[1].name}")
`;
  }

  code += `
# ═══════════════════════════════════════
# EXPORT CLEANED DATA
# ═══════════════════════════════════════
write.csv(df, "cleaned_${fileName.replace(/\.\w+$/, '')}.csv", row.names = FALSE)
cat("Cleaned data exported!\\n")
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
  COUNT(*) AS total_rows${numCols.length > 0 ? ',\n  ' + numCols.map(c => `AVG(${c.name}) AS avg_${c.name}`).join(',\n  ') : ''}
FROM ${table};

`;

  // Missing count per column
  sql += `-- 2. Missing values per column\nSELECT\n`;
  sql += analysis.columnInfo.map(c =>
    `  SUM(CASE WHEN ${c.name} IS NULL THEN 1 ELSE 0 END) AS missing_${c.name}`
  ).join(',\n');
  sql += `\nFROM ${table};\n\n`;

  // Filtering examples
  sql += `-- ═══════════════════════════════════════\n-- FILTERING QUERIES\n-- ═══════════════════════════════════════\n\n`;
  if (numCols.length > 0) {
    const nc = numCols[0];
    sql += `-- Filter: ${nc.name} above average\nSELECT *\nFROM ${table}\nWHERE ${nc.name} > (SELECT AVG(${nc.name}) FROM ${table})${limitEnd};\n\n`;
  }
  if (catCols.length > 0 && numCols.length > 0) {
    sql += `-- Filter: Top categories by ${numCols[0].name}\nSELECT ${catCols[0].name}, SUM(${numCols[0].name}) AS total\nFROM ${table}\nGROUP BY ${catCols[0].name}\nHAVING SUM(${numCols[0].name}) > 0\nORDER BY total DESC${limitEnd};\n\n`;
  }
  if (dateCols.length > 0) {
    const dc = dateCols[0].name;
    sql += `-- Filter: Last 30 days\nSELECT *\nFROM ${table}\nWHERE ${dc} >= ${dialect === 'postgresql' ? `CURRENT_DATE - INTERVAL '30 days'` : dialect === 'mysql' ? `DATE_SUB(CURDATE(), INTERVAL 30 DAY)` : dialect === 'sqlserver' ? `DATEADD(DAY, -30, GETDATE())` : `DATE('now', '-30 days')`}${limitEnd};\n\n`;
  }

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

    // Growth rate with window functions
    if (numCols.length > 0 && (dialect === 'postgresql' || dialect === 'mysql' || dialect === 'sqlserver')) {
      sql += `-- Month-over-Month growth rate\nSELECT\n  ${dateGroup} AS month,\n  SUM(${numCols[0].name}) AS total,\n  LAG(SUM(${numCols[0].name})) OVER (ORDER BY ${dateGroup}) AS prev_month,\n  ROUND((SUM(${numCols[0].name}) - LAG(SUM(${numCols[0].name})) OVER (ORDER BY ${dateGroup}))::NUMERIC /\n    NULLIF(LAG(SUM(${numCols[0].name})) OVER (ORDER BY ${dateGroup}), 0) * 100, 2) AS growth_pct\nFROM ${table}\nGROUP BY ${dateGroup}\nORDER BY month;\n\n`;
    }
  }

  // Numeric stats
  numCols.forEach(c => {
    sql += `-- Statistics for ${c.name}\nSELECT\n  MIN(${c.name}) AS min_val,\n  MAX(${c.name}) AS max_val,\n  AVG(${c.name}) AS avg_val,\n  COUNT(${c.name}) AS non_null_count\nFROM ${table};\n\n`;
  });

  // Percentile / distribution
  if (numCols.length > 0 && dialect === 'postgresql') {
    sql += `-- Percentile analysis\nSELECT\n`;
    sql += numCols.map(c => `  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${c.name}) AS p25_${c.name},\n  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ${c.name}) AS median_${c.name},\n  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${c.name}) AS p75_${c.name}`).join(',\n');
    sql += `\nFROM ${table};\n\n`;
  }

  // Anomaly detection
  if (numCols.length > 0) {
    const nc = numCols[0];
    sql += `-- Anomaly detection (IQR method)\nWITH stats AS (\n  SELECT\n    ${dialect === 'postgresql' ? `PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${nc.name}) AS q1,\n    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${nc.name}) AS q3` : `AVG(${nc.name}) - 1.5 * STDDEV(${nc.name}) AS q1,\n    AVG(${nc.name}) + 1.5 * STDDEV(${nc.name}) AS q3`}\n  FROM ${table}\n)\nSELECT COUNT(*) AS outlier_count\nFROM ${table}, stats\nWHERE ${nc.name} < q1 - 1.5 * (q3 - q1)\n   OR ${nc.name} > q3 + 1.5 * (q3 - q1);\n\n`;
  }

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
