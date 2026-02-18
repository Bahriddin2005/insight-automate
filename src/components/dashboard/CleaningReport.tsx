import { motion } from 'framer-motion';
import { FileText, Download, CheckCircle2, AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18nContext';
import { toCSV, toExcelBlob } from '@/lib/dataProcessor';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

interface CleaningReportProps {
  analysis: DatasetAnalysis;
  fileName: string;
}

export default function CleaningReport({ analysis, fileName }: CleaningReportProps) {
  const { t } = useI18n();

  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric');
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical');
  const dateCols = analysis.columnInfo.filter(c => c.type === 'datetime');
  const highMissing = analysis.columnInfo.filter(c => c.missingPercent > 10);
  const outlierCols = numCols.filter(c => c.stats && c.stats.outliers > 0);

  const inconsistentCols = analysis.columnInfo.filter(c => c.inconsistentFormats && c.inconsistentFormats > 0);
  const constantCols = analysis.columnInfo.filter(c => c.cardinality === 'constant');
  const nullPatternCols = analysis.columnInfo.filter(c => c.nullPattern && c.nullPattern !== 'none' && c.nullPattern !== 'random');

  const actions: { label: string; detail: string; type: 'success' | 'warning' }[] = [
    { label: t('report.trimmed'), detail: `${analysis.columns} ${t('report.columns')}`, type: 'success' },
    { label: t('report.duplicatesRemoved'), detail: `${analysis.duplicatesRemoved} ${t('table.rows')}`, type: analysis.duplicatesRemoved > 0 ? 'warning' : 'success' },
    { label: t('report.numericConverted'), detail: `${numCols.length} ${t('report.columns')}`, type: 'success' },
    { label: t('report.datesParsed'), detail: `${dateCols.length} ${t('report.columns')}`, type: 'success' },
    { label: t('report.missingFilled'), detail: `${numCols.length} median + ${catCols.length} mode`, type: highMissing.length > 0 ? 'warning' : 'success' },
    { label: t('report.outliersDetected'), detail: `${outlierCols.reduce((a, c) => a + (c.stats?.outliers || 0), 0)} ${t('report.inColumns')} ${outlierCols.length}`, type: outlierCols.length > 0 ? 'warning' : 'success' },
    ...(inconsistentCols.length > 0 ? [{ label: 'Format nomuvofiqligi', detail: `${inconsistentCols.length} ustun`, type: 'warning' as const }] : []),
    ...(constantCols.length > 0 ? [{ label: 'Doimiy qiymatli ustunlar', detail: `${constantCols.length} ustun`, type: 'warning' as const }] : []),
    ...(nullPatternCols.length > 0 ? [{ label: 'Null pattern aniqlandi', detail: nullPatternCols.map(c => `${c.name}: ${c.nullPattern}`).join(', '), type: 'warning' as const }] : []),
  ];

  const generateDataDictionary = () => {
    const dict = analysis.columnInfo.map(c => ({
      name: c.name,
      type: c.type,
      missing_count: c.missingCount,
      missing_percent: +c.missingPercent.toFixed(2),
      unique_count: c.uniqueCount,
      cardinality: c.cardinality || 'unknown',
      null_pattern: c.nullPattern || 'unknown',
      inconsistent_formats: c.inconsistentFormats || 0,
      ...(c.stats ? {
        min: c.stats.min,
        max: c.stats.max,
        mean: +c.stats.mean.toFixed(2),
        median: c.stats.median,
        q1: c.stats.q1,
        q3: c.stats.q3,
        outliers: c.stats.outliers,
      } : {}),
      ...(c.topValues ? { top_values: c.topValues.slice(0, 5) } : {}),
      ...(c.dateRange ? { date_range: c.dateRange } : {}),
    }));
    return JSON.stringify(dict, null, 2);
  };

  const generateCleaningReportMD = () => {
    let md = `# Cleaning Report — ${fileName}\n\n`;
    md += `## Summary\n`;
    md += `| Metric | Value |\n|---|---|\n`;
    md += `| Original Rows | ${analysis.rawRowCount} |\n`;
    md += `| Cleaned Rows | ${analysis.rows} |\n`;
    md += `| Columns | ${analysis.columns} |\n`;
    md += `| Duplicates Removed | ${analysis.duplicatesRemoved} |\n`;
    md += `| Missing % | ${analysis.missingPercent}% |\n`;
    md += `| Data Quality Score | ${analysis.qualityScore}/100 |\n`;
    md += `| Parsing Errors | ${analysis.parsingErrors} |\n\n`;
    md += `## Actions Taken\n`;
    actions.forEach(a => { md += `- **${a.label}**: ${a.detail}\n`; });
    md += `\n## Column Details\n\n`;
    md += `| Column | Type | Missing % | Unique |\n|---|---|---|---|\n`;
    analysis.columnInfo.forEach(c => {
      md += `| ${c.name} | ${c.type} | ${c.missingPercent.toFixed(1)}% | ${c.uniqueCount} |\n`;
    });
    if (outlierCols.length > 0) {
      md += `\n## Outliers (IQR Method)\n\n`;
      md += `| Column | Outliers | Q1 | Q3 | IQR |\n|---|---|---|---|---|\n`;
      outlierCols.forEach(c => {
        md += `| ${c.name} | ${c.stats!.outliers} | ${c.stats!.q1} | ${c.stats!.q3} | ${c.stats!.iqr.toFixed(2)} |\n`;
      });
    }
    return md;
  };

  const downloadFile = (content: string, name: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExportPackage = () => {
    // Download all 3 files
    const base = fileName.replace(/\.\w+$/, '');
    downloadFile(toCSV(analysis.cleanedData), `${base}_cleaned.csv`, 'text/csv');
    setTimeout(() => downloadFile(generateDataDictionary(), `${base}_data_dictionary.json`, 'application/json'), 300);
    setTimeout(() => downloadFile(generateCleaningReportMD(), `${base}_cleaning_report.md`, 'text/markdown'), 600);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-accent-foreground" />
          </div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('report.title')}</h2>
        </div>
        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={downloadExportPackage}>
          <Package className="w-3 h-3" /> {t('report.exportPackage')}
        </Button>
      </div>

      {/* Before/After Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: t('report.beforeRows'), value: analysis.rawRowCount.toLocaleString() },
          { label: t('report.afterRows'), value: analysis.rows.toLocaleString() },
          { label: t('report.qualityScore'), value: `${analysis.qualityScore}/100` },
          { label: t('report.parsingErrors'), value: String(analysis.parsingErrors) },
        ].map((s, i) => (
          <div key={i} className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className="text-lg font-bold text-foreground mt-1 data-font">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {actions.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {a.type === 'success'
              ? <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              : <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
            <span className="text-foreground/80">{a.label}</span>
            <span className="text-muted-foreground ml-auto data-font">{a.detail}</span>
          </div>
        ))}
      </div>

      {/* Export buttons */}
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/30">
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => downloadFile(toCSV(analysis.cleanedData), `${fileName.replace(/\.\w+$/, '')}_cleaned.csv`, 'text/csv')}>
          <Download className="w-3 h-3" /> CSV
        </Button>
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => {
          const blob = toExcelBlob(analysis.cleanedData);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${fileName.replace(/\.\w+$/, '')}_cleaned.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
        }}>
          <Download className="w-3 h-3" /> XLSX
        </Button>
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => downloadFile(generateDataDictionary(), `${fileName.replace(/\.\w+$/, '')}_dictionary.json`, 'application/json')}>
          <Download className="w-3 h-3" /> Dictionary
        </Button>
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => downloadFile(generateCleaningReportMD(), `${fileName.replace(/\.\w+$/, '')}_report.md`, 'text/markdown')}>
          <Download className="w-3 h-3" /> Report
        </Button>
      </div>
    </motion.div>
  );
}
