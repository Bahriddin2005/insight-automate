import type { ColumnInfo, DatasetAnalysis } from './dataProcessor';

export type TemplateId = 'executive' | 'sales' | 'finance' | 'education' | 'hr' | 'marketing' | 'quality' | 'explorer'
  | 'healthcare' | 'logistics' | 'ecommerce' | 'support' | 'inventory' | 'realestate' | 'operations' | 'social'
  | 'growth' | 'ai-product';

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
  {
    id: 'healthcare',
    name: 'Healthcare Analytics',
    nameUz: 'Sog\'liqni saqlash tahlili',
    description: 'Patient metrics, treatment outcomes, utilization trends.',
    descriptionUz: 'Bemor ko\'rsatkichlari, davolash natijalari, foydalanish trendlari.',
    icon: '🏥',
    color: 'from-green-500 to-emerald-600',
    slots: [
      { id: 'kpi_rows', label: 'Records', type: 'kpi', requires: [], description: 'Count' },
      { id: 'kpi_avg', label: 'Avg Metric', type: 'kpi', requires: ['numeric'], description: 'Mean' },
      { id: 'kpi_quality', label: 'Data Quality', type: 'kpi', requires: [], description: 'Score' },
      { id: 'kpi_date', label: 'Period', type: 'kpi', requires: ['datetime'], description: 'Range' },
      { id: 'category_bar', label: 'Category Breakdown', type: 'bar', requires: ['categorical'], description: 'By category' },
      { id: 'trend', label: 'Trend Over Time', type: 'line', requires: ['datetime', 'numeric'], description: 'Time series' },
      { id: 'histogram', label: 'Distribution', type: 'histogram', requires: ['numeric'], description: 'Histogram' },
      { id: 'missing_chart', label: 'Completeness', type: 'missing', requires: [], description: 'Missing' },
    ],
  },
  {
    id: 'logistics',
    name: 'Logistics & Supply Chain',
    nameUz: 'Logistika va yetkazib berish',
    description: 'Shipments, delivery times, route performance, inventory flow.',
    descriptionUz: 'Yuk tashish, yetkazib berish vaqti, marshrut samaradorligi.',
    icon: '📦',
    color: 'from-amber-500 to-orange-600',
    slots: [
      { id: 'kpi_rows', label: 'Shipments', type: 'kpi', requires: [], description: 'Count' },
      { id: 'kpi_total', label: 'Total Value', type: 'kpi', requires: ['numeric'], description: 'Sum' },
      { id: 'kpi_avg', label: 'Avg Delivery', type: 'kpi', requires: ['numeric'], description: 'Mean' },
      { id: 'kpi_quality', label: 'Quality', type: 'kpi', requires: [], description: 'Score' },
      { id: 'route_bar', label: 'Route Performance', type: 'bar', requires: ['categorical'], description: 'By route' },
      { id: 'trend', label: 'Volume Trend', type: 'line', requires: ['datetime', 'numeric'], description: 'Over time' },
      { id: 'category_pie', label: 'Category Split', type: 'pie', requires: ['categorical'], description: 'Distribution' },
      { id: 'histogram', label: 'Value Distribution', type: 'histogram', requires: ['numeric'], description: 'Histogram' },
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Analytics',
    nameUz: 'E-ticaret tahlili',
    description: 'Orders, conversion, product performance, customer segments.',
    descriptionUz: 'Buyurtmalar, konversiya, mahsulot natijalari, mijoz segmentlari.',
    icon: '🛒',
    color: 'from-violet-500 to-purple-600',
    slots: [
      { id: 'kpi_rows', label: 'Orders', type: 'kpi', requires: [], description: 'Count' },
      { id: 'kpi_total', label: 'Total Revenue', type: 'kpi', requires: ['numeric'], description: 'Sum' },
      { id: 'kpi_avg', label: 'Avg Order', type: 'kpi', requires: ['numeric'], description: 'Mean' },
      { id: 'kpi_quality', label: 'Quality', type: 'kpi', requires: [], description: 'Score' },
      { id: 'product_bar', label: 'Top Products', type: 'bar', requires: ['categorical'], description: 'Best sellers' },
      { id: 'trend', label: 'Sales Trend', type: 'line', requires: ['datetime', 'numeric'], description: 'Over time' },
      { id: 'category_pie', label: 'Category Mix', type: 'pie', requires: ['categorical'], description: 'Distribution' },
      { id: 'histogram', label: 'Order Distribution', type: 'histogram', requires: ['numeric'], description: 'Histogram' },
    ],
  },
  {
    id: 'support',
    name: 'Customer Support',
    nameUz: 'Mijoz qo\'llab-quvvatlash',
    description: 'Tickets, resolution time, satisfaction, agent performance.',
    descriptionUz: 'Tiketlar, hal qilish vaqti, qoniqish, operator samaradorligi.',
    icon: '🎧',
    color: 'from-cyan-500 to-blue-600',
    slots: [
      { id: 'kpi_rows', label: 'Tickets', type: 'kpi', requires: [], description: 'Count' },
      { id: 'kpi_avg', label: 'Avg Resolution', type: 'kpi', requires: ['numeric'], description: 'Mean' },
      { id: 'kpi_quality', label: 'Data Quality', type: 'kpi', requires: [], description: 'Score' },
      { id: 'kpi_date', label: 'Period', type: 'kpi', requires: ['datetime'], description: 'Range' },
      { id: 'agent_bar', label: 'Agent Performance', type: 'bar', requires: ['categorical'], description: 'By agent' },
      { id: 'trend', label: 'Volume Trend', type: 'line', requires: ['datetime', 'numeric'], description: 'Over time' },
      { id: 'category_pie', label: 'Category Split', type: 'pie', requires: ['categorical'], description: 'Types' },
      { id: 'missing_chart', label: 'Completeness', type: 'missing', requires: [], description: 'Missing' },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory & Stock',
    nameUz: 'Zaxira va tovar',
    description: 'Stock levels, movement, reorder points, warehouse metrics.',
    descriptionUz: 'Ombordagi zaxira, harakat, qayta buyurtma nuqtalari.',
    icon: '📋',
    color: 'from-lime-500 to-green-600',
    slots: [
      { id: 'kpi_rows', label: 'SKUs', type: 'kpi', requires: [], description: 'Count' },
      { id: 'kpi_total', label: 'Total Value', type: 'kpi', requires: ['numeric'], description: 'Sum' },
      { id: 'kpi_avg', label: 'Avg Stock', type: 'kpi', requires: ['numeric'], description: 'Mean' },
      { id: 'kpi_quality', label: 'Quality', type: 'kpi', requires: [], description: 'Score' },
      { id: 'category_bar', label: 'Category Stock', type: 'bar', requires: ['categorical'], description: 'By category' },
      { id: 'trend', label: 'Movement Trend', type: 'line', requires: ['datetime', 'numeric'], description: 'Over time' },
      { id: 'histogram', label: 'Stock Distribution', type: 'histogram', requires: ['numeric'], description: 'Histogram' },
      { id: 'heatmap', label: 'Correlations', type: 'heatmap', requires: ['numeric'], description: 'Matrix' },
    ],
  },
  {
    id: 'realestate',
    name: 'Real Estate',
    nameUz: 'Ko\'chmas mulk',
    description: 'Properties, prices, listings, market trends.',
    descriptionUz: 'Ob\'ektlar, narxlar, ro\'yxatlar, bozor trendlari.',
    icon: '🏠',
    color: 'from-rose-500 to-pink-600',
    slots: [
      { id: 'kpi_rows', label: 'Listings', type: 'kpi', requires: [], description: 'Count' },
      { id: 'kpi_total', label: 'Total Value', type: 'kpi', requires: ['numeric'], description: 'Sum' },
      { id: 'kpi_avg', label: 'Avg Price', type: 'kpi', requires: ['numeric'], description: 'Mean' },
      { id: 'kpi_quality', label: 'Quality', type: 'kpi', requires: [], description: 'Score' },
      { id: 'location_bar', label: 'By Location', type: 'bar', requires: ['categorical'], description: 'Top areas' },
      { id: 'trend', label: 'Price Trend', type: 'line', requires: ['datetime', 'numeric'], description: 'Over time' },
      { id: 'category_pie', label: 'Type Split', type: 'pie', requires: ['categorical'], description: 'Distribution' },
      { id: 'histogram', label: 'Price Distribution', type: 'histogram', requires: ['numeric'], description: 'Histogram' },
    ],
  },
  {
    id: 'operations',
    name: 'Operations & Ops',
    nameUz: 'Operatsiyalar',
    description: 'Process metrics, throughput, efficiency, resource utilization.',
    descriptionUz: 'Jarayon ko\'rsatkichlari, oqim, samaradorlik.',
    icon: '⚙️',
    color: 'from-slate-500 to-zinc-600',
    slots: [
      { id: 'kpi_rows', label: 'Records', type: 'kpi', requires: [], description: 'Count' },
      { id: 'kpi_total', label: 'Total Output', type: 'kpi', requires: ['numeric'], description: 'Sum' },
      { id: 'kpi_avg', label: 'Avg Metric', type: 'kpi', requires: ['numeric'], description: 'Mean' },
      { id: 'kpi_quality', label: 'Quality', type: 'kpi', requires: [], description: 'Score' },
      { id: 'process_bar', label: 'Process Breakdown', type: 'bar', requires: ['categorical'], description: 'By process' },
      { id: 'trend', label: 'Throughput Trend', type: 'line', requires: ['datetime', 'numeric'], description: 'Over time' },
      { id: 'heatmap', label: 'Correlations', type: 'heatmap', requires: ['numeric'], description: 'Matrix' },
      { id: 'missing_chart', label: 'Completeness', type: 'missing', requires: [], description: 'Missing' },
    ],
  },
  {
    id: 'growth',
    name: 'Growth & Retention',
    nameUz: "O'sashton va saqlanish",
    description: 'DAU/MAU, cohorts, retention curves, MoM/YoY growth.',
    descriptionUz: 'Kunlik/oylik foydalanuvchilar, kohortlar, saqlanish egri chiziqlari.',
    icon: '🌱',
    color: 'from-emerald-500 to-teal-600',
    slots: [
      { id: 'kpi_rows', label: 'Users/Events', type: 'kpi', requires: [], description: 'Count' },
      { id: 'kpi_avg', label: 'Avg per User', type: 'kpi', requires: ['numeric'], description: 'Mean' },
      { id: 'kpi_quality', label: 'Data Quality', type: 'kpi', requires: [], description: 'Score' },
      { id: 'kpi_date', label: 'Period', type: 'kpi', requires: ['datetime'], description: 'Date range' },
      { id: 'trend', label: 'DAU/MAU Trend', type: 'line', requires: ['datetime', 'numeric'], description: 'Time series' },
      { id: 'cohort_bar', label: 'Cohort Breakdown', type: 'bar', requires: ['categorical'], description: 'By cohort' },
      { id: 'retention_line', label: 'Retention Curve', type: 'line', requires: ['datetime', 'numeric'], description: 'Retention' },
      { id: 'category_pie', label: 'Segment Split', type: 'pie', requires: ['categorical'], description: 'Distribution' },
    ],
  },
  {
    id: 'ai-product',
    name: 'AI Product Analytics',
    nameUz: 'AI mahsulot tahlili',
    description: 'Tokens, latency, model usage, AI performance metrics.',
    descriptionUz: 'Tokenlar, kechikish, model foydalanish, AI samaradorlik.',
    icon: '🤖',
    color: 'from-violet-500 to-fuchsia-600',
    slots: [
      { id: 'kpi_rows', label: 'Requests', type: 'kpi', requires: [], description: 'Count' },
      { id: 'kpi_avg', label: 'Avg Latency', type: 'kpi', requires: ['numeric'], description: 'Mean ms' },
      { id: 'kpi_total', label: 'Total Tokens', type: 'kpi', requires: ['numeric'], description: 'Sum' },
      { id: 'kpi_quality', label: 'Quality', type: 'kpi', requires: [], description: 'Score' },
      { id: 'model_bar', label: 'Model Usage', type: 'bar', requires: ['categorical'], description: 'By model' },
      { id: 'latency_trend', label: 'Latency Over Time', type: 'line', requires: ['datetime', 'numeric'], description: 'Trend' },
      { id: 'token_histogram', label: 'Token Distribution', type: 'histogram', requires: ['numeric'], description: 'Histogram' },
      { id: 'heatmap', label: 'Correlations', type: 'heatmap', requires: ['numeric'], description: 'Matrix' },
    ],
  },
  {
    id: 'social',
    name: 'Social & Engagement',
    nameUz: 'Ijtimoiy tarmoq va jalb',
    description: 'Engagement, reach, followers, content performance.',
    descriptionUz: 'Jalb qilish, qamrov, obunachilar, kontent natijalari.',
    icon: '📱',
    color: 'from-sky-500 to-indigo-600',
    slots: [
      { id: 'kpi_rows', label: 'Posts/Events', type: 'kpi', requires: [], description: 'Count' },
      { id: 'kpi_total', label: 'Total Engagement', type: 'kpi', requires: ['numeric'], description: 'Sum' },
      { id: 'kpi_avg', label: 'Avg Engagement', type: 'kpi', requires: ['numeric'], description: 'Mean' },
      { id: 'kpi_quality', label: 'Quality', type: 'kpi', requires: [], description: 'Score' },
      { id: 'channel_bar', label: 'Channel Performance', type: 'bar', requires: ['categorical'], description: 'By channel' },
      { id: 'trend', label: 'Engagement Trend', type: 'line', requires: ['datetime', 'numeric'], description: 'Over time' },
      { id: 'category_pie', label: 'Content Split', type: 'pie', requires: ['categorical'], description: 'Distribution' },
      { id: 'histogram', label: 'Distribution', type: 'histogram', requires: ['numeric'], description: 'Histogram' },
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

  const colNames = analysis.columnInfo.map(c => c.name.toLowerCase()).join(' ');

  if (analysis.qualityScore < 70) return 'quality';
  if (/revenue|sales|price|amount|order|product/.test(colNames) && dateCols.length > 0) return 'sales';
  if (/patient|treatment|diagnosis|hospital|medical/.test(colNames)) return 'healthcare';
  if (/shipment|delivery|route|warehouse|logistics|freight/.test(colNames)) return 'logistics';
  if (/order|cart|checkout|product|sku|ecommerce/.test(colNames)) return 'ecommerce';
  if (/ticket|support|resolution|agent|satisfaction/.test(colNames)) return 'support';
  if (/stock|inventory|sku|warehouse|quantity|reorder/.test(colNames)) return 'inventory';
  if (/property|price|listing|location|square|realestate|mulk/.test(colNames)) return 'realestate';
  if (/throughput|process|efficiency|utilization|output/.test(colNames)) return 'operations';
  if (/user_id|userid|user\.id|dau|mau|cohort|retention|churn/.test(colNames) && dateCols.length > 0) return 'growth';
  if (/token|latency|model|prompt|llm|embedding|inference/.test(colNames)) return 'ai-product';
  if (/engagement|followers|post|reach|likes|social|content/.test(colNames)) return 'social';
  if (/score|grade|student|subject|class/.test(colNames)) return 'education';
  if (/employee|department|salary|hire|position|xodim/.test(colNames)) return 'hr';
  if (/campaign|lead|click|conversion|channel/.test(colNames)) return 'marketing';
  if (/transaction|payment|debit|credit|balance/.test(colNames)) return 'finance';
  if (dateCols.length > 0 && numCols.length > 0) return 'executive';
  return 'explorer';
}
