import type { ColumnInfo, DatasetAnalysis } from './dataProcessor';

export type TemplateId = 'executive' | 'sales' | 'finance' | 'education' | 'hr' | 'marketing' | 'quality' | 'explorer';

export interface TemplateSlot {
  id: string;
  label: string;
  type: 'kpi' | 'bar' | 'line' | 'pie' | 'histogram' | 'heatmap' | 'missing';
  requires: ('numeric' | 'categorical' | 'datetime')[];
  description: string;
}

export interface DashboardTemplate {
  id: TemplateId;
  name: string;
  nameUz: string;
  description: string;
  descriptionUz: string;
  icon: string;
  color: string;
  slots: TemplateSlot[];
}

export interface SlotBinding {
  slotId: string;
  column?: string;
  metric?: string;
}

export const TEMPLATES: DashboardTemplate[] = [
  {
    id: 'executive',
    name: 'Executive Overview',
    nameUz: 'Ijroiya ko\'rinish',
    description: 'KPIs, trends, top categories, and data quality at a glance.',
    descriptionUz: 'KPIlar, trendlar, top kategoriyalar va sifat bir qarashda.',
    icon: '📊',
    color: 'from-primary to-accent',
    slots: [
      { id: 'kpi_rows', label: 'Total Rows', type: 'kpi', requires: [], description: 'Row count' },
      { id: 'kpi_cols', label: 'Total Columns', type: 'kpi', requires: [], description: 'Column count' },
      { id: 'kpi_quality', label: 'Quality Score', type: 'kpi', requires: [], description: 'Data quality' },
      { id: 'kpi_missing', label: 'Missing %', type: 'kpi', requires: [], description: 'Missing ratio' },
      { id: 'kpi_dups', label: 'Duplicates', type: 'kpi', requires: [], description: 'Removed count' },
      { id: 'kpi_date', label: 'Date Range', type: 'kpi', requires: ['datetime'], description: 'Date span' },
      { id: 'trend', label: 'Trend Over Time', type: 'line', requires: ['datetime', 'numeric'], description: 'Time series' },
      { id: 'top_cat', label: 'Top Categories', type: 'bar', requires: ['categorical'], description: 'Top 10 breakdown' },
      { id: 'missing_chart', label: 'Missing Values', type: 'missing', requires: [], description: 'Missing by column' },
    ],
  },
  {
    id: 'sales',
    name: 'Sales Performance',
    nameUz: 'Sotuv ko\'rsatkichlari',
    description: 'Revenue KPIs, product rankings, monthly trends.',
    descriptionUz: 'Daromad KPIlari, mahsulot reytingi, oylik trendlar.',
    icon: '💰',
    color: 'from-accent to-primary',
    slots: [
      { id: 'kpi_total', label: 'Total Revenue', type: 'kpi', requires: ['numeric'], description: 'Sum of main metric' },
      { id: 'kpi_avg', label: 'Average', type: 'kpi', requires: ['numeric'], description: 'Mean value' },
      { id: 'kpi_rows', label: 'Transactions', type: 'kpi', requires: [], description: 'Row count' },
      { id: 'kpi_quality', label: 'Quality', type: 'kpi', requires: [], description: 'Data quality' },
      { id: 'monthly_trend', label: 'Monthly Trend', type: 'line', requires: ['datetime', 'numeric'], description: 'Revenue over time' },
      { id: 'product_top', label: 'Top 10 Products', type: 'bar', requires: ['categorical'], description: 'Best sellers' },
      { id: 'category_pie', label: 'Category Split', type: 'pie', requires: ['categorical'], description: 'Distribution' },
      { id: 'histogram', label: 'Value Distribution', type: 'histogram', requires: ['numeric'], description: 'Amount histogram' },
    ],
  },
  {
    id: 'finance',
    name: 'Finance / Transactions',
    nameUz: 'Moliya / Tranzaksiyalar',
    description: 'Cash flow, daily trends, anomalies, spend breakdown.',
    descriptionUz: 'Pul oqimi, kunlik trendlar, anomaliyalar.',
    icon: '🏦',
    color: 'from-chart-3 to-chart-4',
    slots: [
      { id: 'kpi_total', label: 'Total Flow', type: 'kpi', requires: ['numeric'], description: 'Sum' },
      { id: 'kpi_avg', label: 'Avg Transaction', type: 'kpi', requires: ['numeric'], description: 'Mean' },
      { id: 'kpi_rows', label: 'Entries', type: 'kpi', requires: [], description: 'Count' },
      { id: 'kpi_date', label: 'Period', type: 'kpi', requires: ['datetime'], description: 'Date range' },
      { id: 'daily_trend', label: 'Daily Trend', type: 'line', requires: ['datetime', 'numeric'], description: 'Over time' },
      { id: 'category', label: 'Spend Categories', type: 'bar', requires: ['categorical'], description: 'Breakdown' },
      { id: 'histogram', label: 'Amount Distribution', type: 'histogram', requires: ['numeric'], description: 'Histogram' },
      { id: 'missing_chart', label: 'Data Completeness', type: 'missing', requires: [], description: 'Missing values' },
    ],
  },
  {
    id: 'education',
    name: 'Education / Results',
    nameUz: 'Ta\'lim / Natijalar',
    description: 'Student performance, subject comparison, class rankings.',
    descriptionUz: 'Talaba natijalari, fan taqqoslash, sinf reytingi.',
    icon: '🎓',
    color: 'from-chart-4 to-chart-5',
    slots: [
      { id: 'kpi_rows', label: 'Students', type: 'kpi', requires: [], description: 'Total count' },
      { id: 'kpi_avg', label: 'Avg Score', type: 'kpi', requires: ['numeric'], description: 'Mean score' },
      { id: 'kpi_quality', label: 'Data Quality', type: 'kpi', requires: [], description: 'Score' },
      { id: 'kpi_missing', label: 'Missing %', type: 'kpi', requires: [], description: 'Gaps' },
      { id: 'subject_bar', label: 'Subject Comparison', type: 'bar', requires: ['categorical'], description: 'By subject' },
      { id: 'score_dist', label: 'Score Distribution', type: 'histogram', requires: ['numeric'], description: 'Histogram' },
      { id: 'trend', label: 'Performance Trend', type: 'line', requires: ['datetime', 'numeric'], description: 'Over time' },
      { id: 'ranking_pie', label: 'Grade Distribution', type: 'pie', requires: ['categorical'], description: 'Grades' },
    ],
  },
  {
    id: 'hr',
    name: 'HR / Employees',
    nameUz: 'HR / Xodimlar',
    description: 'Headcount, department breakdown, performance distribution.',
    descriptionUz: 'Xodimlar soni, bo\'lim taqsimoti, samaradorlik.',
    icon: '👥',
    color: 'from-primary to-chart-4',
    slots: [
      { id: 'kpi_rows', label: 'Headcount', type: 'kpi', requires: [], description: 'Total employees' },
      { id: 'kpi_avg', label: 'Avg Metric', type: 'kpi', requires: ['numeric'], description: 'Average' },
      { id: 'kpi_quality', label: 'Data Quality', type: 'kpi', requires: [], description: 'Score' },
      { id: 'kpi_cols', label: 'Data Fields', type: 'kpi', requires: [], description: 'Columns' },
      { id: 'dept_bar', label: 'Department Breakdown', type: 'bar', requires: ['categorical'], description: 'By dept' },
      { id: 'perf_dist', label: 'Performance Distribution', type: 'histogram', requires: ['numeric'], description: 'Histogram' },
      { id: 'dept_pie', label: 'Department Split', type: 'pie', requires: ['categorical'], description: 'Pie' },
      { id: 'trend', label: 'Trend', type: 'line', requires: ['datetime', 'numeric'], description: 'Over time' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing Analytics',
    nameUz: 'Marketing tahlili',
    description: 'Leads, conversions, campaign comparison, trends.',
    descriptionUz: 'Lidlar, konversiya, kampaniya taqqoslash.',
    icon: '📈',
    color: 'from-chart-5 to-chart-3',
    slots: [
      { id: 'kpi_rows', label: 'Total Leads', type: 'kpi', requires: [], description: 'Count' },
      { id: 'kpi_total', label: 'Total Value', type: 'kpi', requires: ['numeric'], description: 'Sum' },
      { id: 'kpi_avg', label: 'Avg Value', type: 'kpi', requires: ['numeric'], description: 'Mean' },
      { id: 'kpi_quality', label: 'Quality', type: 'kpi', requires: [], description: 'Score' },
      { id: 'campaign_bar', label: 'Campaign Comparison', type: 'bar', requires: ['categorical'], description: 'Top campaigns' },
      { id: 'trend', label: 'Time Trend', type: 'line', requires: ['datetime', 'numeric'], description: 'Over time' },
      { id: 'channel_pie', label: 'Channel Split', type: 'pie', requires: ['categorical'], description: 'Distribution' },
      { id: 'histogram', label: 'Value Distribution', type: 'histogram', requires: ['numeric'], description: 'Histogram' },
    ],
  },
  {
    id: 'quality',
    name: 'Data Quality Dashboard',
    nameUz: 'Ma\'lumotlar sifati',
    description: 'Missing values, duplicates, outliers, parsing status.',
    descriptionUz: 'Yo\'qolgan qiymatlar, dublikatlar, og\'ishlar.',
    icon: '🔍',
    color: 'from-accent to-chart-3',
    slots: [
      { id: 'kpi_quality', label: 'Quality Score', type: 'kpi', requires: [], description: 'Overall score' },
      { id: 'kpi_missing', label: 'Missing %', type: 'kpi', requires: [], description: 'Missing ratio' },
      { id: 'kpi_dups', label: 'Duplicates', type: 'kpi', requires: [], description: 'Removed' },
      { id: 'kpi_rows', label: 'Clean Rows', type: 'kpi', requires: [], description: 'After cleaning' },
      { id: 'missing_chart', label: 'Missing by Column', type: 'missing', requires: [], description: 'Bar chart' },
      { id: 'histogram', label: 'Numeric Outliers', type: 'histogram', requires: ['numeric'], description: 'Distribution' },
      { id: 'type_bar', label: 'Column Types', type: 'bar', requires: [], description: 'Type breakdown' },
      { id: 'heatmap', label: 'Correlation', type: 'heatmap', requires: ['numeric'], description: 'Numeric correlation' },
    ],
  },
  {
    id: 'explorer',
    name: 'Custom Explorer',
    nameUz: 'Maxsus ko\'rish',
    description: 'All charts auto-generated from your data. Full flexibility.',
    descriptionUz: 'Barcha grafiklar avtomatik. To\'liq moslashuvchanlik.',
    icon: '🧪',
    color: 'from-chart-4 to-accent',
    slots: [
      { id: 'kpi_rows', label: 'Rows', type: 'kpi', requires: [], description: 'Count' },
      { id: 'kpi_cols', label: 'Columns', type: 'kpi', requires: [], description: 'Count' },
      { id: 'kpi_quality', label: 'Quality', type: 'kpi', requires: [], description: 'Score' },
      { id: 'kpi_missing', label: 'Missing', type: 'kpi', requires: [], description: 'Percent' },
      { id: 'top_cat', label: 'Top Categories', type: 'bar', requires: ['categorical'], description: 'Top 10' },
      { id: 'histogram', label: 'Distribution', type: 'histogram', requires: ['numeric'], description: 'Histogram' },
      { id: 'trend', label: 'Time Series', type: 'line', requires: ['datetime', 'numeric'], description: 'Trend' },
      { id: 'missing_chart', label: 'Missing Values', type: 'missing', requires: [], description: 'By column' },
      { id: 'heatmap', label: 'Correlations', type: 'heatmap', requires: ['numeric'], description: 'Matrix' },
    ],
  },
];

export function autoBindColumns(template: DashboardTemplate, analysis: DatasetAnalysis): SlotBinding[] {
  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric');
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical');
  const dateCols = analysis.columnInfo.filter(c => c.type === 'datetime');

  let numIdx = 0;
  let catIdx = 0;

  return template.slots.map(slot => {
    const binding: SlotBinding = { slotId: slot.id };

    // Check if all requirements are met
    const hasRequired = slot.requires.every(req => {
      if (req === 'numeric') return numCols.length > 0;
      if (req === 'categorical') return catCols.length > 0;
      if (req === 'datetime') return dateCols.length > 0;
      return true;
    });

    if (!hasRequired) return binding;

    // Auto-bind columns
    if (slot.requires.includes('numeric') && numCols.length > 0) {
      binding.column = numCols[numIdx % numCols.length].name;
      if (slot.type !== 'kpi') numIdx++;
    }
    if (slot.requires.includes('categorical') && catCols.length > 0) {
      binding.column = catCols[catIdx % catCols.length].name;
      if (slot.type !== 'kpi') catIdx++;
    }
    if (slot.requires.includes('datetime') && dateCols.length > 0) {
      binding.metric = dateCols[0].name;
    }

    return binding;
  });
}

export function suggestTemplate(analysis: DatasetAnalysis): TemplateId {
  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric');
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical');
  const dateCols = analysis.columnInfo.filter(c => c.type === 'datetime');

  // Heuristics based on column names and types
  const colNames = analysis.columnInfo.map(c => c.name.toLowerCase()).join(' ');

  if (/revenue|sales|price|amount|order/.test(colNames) && dateCols.length > 0) return 'sales';
  if (/score|grade|student|subject|class/.test(colNames)) return 'education';
  if (/employee|department|salary|hire|position/.test(colNames)) return 'hr';
  if (/campaign|lead|click|conversion|channel/.test(colNames)) return 'marketing';
  if (/transaction|payment|debit|credit|balance/.test(colNames)) return 'finance';
  if (analysis.qualityScore < 70) return 'quality';
  if (dateCols.length > 0 && numCols.length > 0) return 'executive';
  return 'explorer';
}
