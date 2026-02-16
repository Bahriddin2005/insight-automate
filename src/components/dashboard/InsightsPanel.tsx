import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18nContext';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

interface InsightsPanelProps {
  analysis: DatasetAnalysis;
}

export default function InsightsPanel({ analysis }: InsightsPanelProps) {
  const { t } = useI18n();

  const insights: string[] = [];

  insights.push(t('insights.dataset', { rows: analysis.rows.toLocaleString(), cols: analysis.columns.toString() }));

  if (analysis.duplicatesRemoved > 0) {
    insights.push(t('insights.duplicates', { count: analysis.duplicatesRemoved.toString() }));
  }

  if (analysis.qualityScore >= 90) insights.push(t('insights.qualityExcellent', { score: analysis.qualityScore }));
  else if (analysis.qualityScore >= 70) insights.push(t('insights.qualityGood', { score: analysis.qualityScore }));
  else insights.push(t('insights.qualityLow', { score: analysis.qualityScore }));

  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical' && c.topValues?.length);
  if (catCols.length > 0) {
    const col = catCols[0];
    insights.push(t('insights.topValue', { col: col.name, val: col.topValues![0].value, count: col.topValues![0].count.toLocaleString() }));
  }

  const highMissing = analysis.columnInfo.filter(c => c.missingPercent > 20);
  if (highMissing.length > 0) {
    insights.push(t('insights.highMissing', { count: highMissing.length, cols: highMissing.map(c => c.name).join(', ') }));
  }

  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric' && c.stats);
  if (numCols.length > 0) {
    const col = numCols[0];
    insights.push(t('insights.numRange', { col: col.name, min: col.stats!.min.toLocaleString(), max: col.stats!.max.toLocaleString(), avg: col.stats!.mean.toFixed(2) }));
  }

  const outlierCols = numCols.filter(c => c.stats && c.stats.outliers > 0);
  if (outlierCols.length > 0) {
    const total = outlierCols.reduce((a, c) => a + c.stats!.outliers, 0);
    insights.push(t('insights.outliers', { total, count: outlierCols.length }));
  }

  if (analysis.dateRange) {
    insights.push(t('insights.dateRange', { min: analysis.dateRange.min, max: analysis.dateRange.max }));
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('insights.title')}</h2>
      </div>
      <ul className="space-y-2.5">
        {insights.map((insight, i) => (
          <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.3 + i * 0.06 }} className="flex items-start gap-2.5 text-sm text-foreground/85">
            <span className="w-1.5 h-1.5 rounded-full gradient-primary mt-1.5 shrink-0" />
            {insight}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
