import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TableProperties, ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '@/lib/i18nContext';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

interface SchemaViewerProps {
  analysis: DatasetAnalysis;
}

const TYPE_BADGES: Record<string, string> = {
  numeric: 'bg-primary/15 text-primary',
  categorical: 'bg-accent/15 text-accent-foreground',
  datetime: 'bg-secondary text-secondary-foreground',
  text: 'bg-muted text-muted-foreground',
  id: 'bg-destructive/15 text-destructive',
};

function MiniHistogram({ values, width = 80, height = 24 }: { values: number[]; width?: number; height?: number }) {
  const bins = 10;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (max - min) / bins || 1;
  const counts = Array.from({ length: bins }, (_, i) => {
    const lo = min + i * step;
    const hi = lo + step;
    return values.filter(v => v >= lo && (i === bins - 1 ? v <= hi : v < hi)).length;
  });
  const maxCount = Math.max(...counts, 1);
  const barW = width / bins - 1;

  return (
    <svg width={width} height={height} className="inline-block align-middle">
      {counts.map((c, i) => {
        const barH = (c / maxCount) * (height - 2);
        return (
          <rect
            key={i}
            x={i * (barW + 1)}
            y={height - barH - 1}
            width={barW}
            height={barH}
            rx={1}
            fill="hsl(var(--primary))"
            opacity={0.7}
          />
        );
      })}
    </svg>
  );
}

function MiniCategoryBars({ topValues, width = 80, height = 24 }: { topValues: { value: string; count: number }[]; width?: number; height?: number }) {
  const items = topValues.slice(0, 5);
  const maxCount = Math.max(...items.map(v => v.count), 1);
  const barH = Math.max((height - items.length + 1) / items.length, 3);

  return (
    <svg width={width} height={height} className="inline-block align-middle">
      {items.map((item, i) => {
        const barW = (item.count / maxCount) * (width - 2);
        return (
          <rect
            key={i}
            x={0}
            y={i * (barH + 1)}
            width={barW}
            height={barH}
            rx={1}
            fill="hsl(var(--accent))"
            opacity={0.7}
          />
        );
      })}
    </svg>
  );
}

export default function SchemaViewer({ analysis }: SchemaViewerProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(true);

  // Pre-compute numeric values per column for sparklines
  const numericValues = useMemo(() => {
    const map: Record<string, number[]> = {};
    analysis.columnInfo.forEach(col => {
      if (col.type === 'numeric') {
        map[col.name] = analysis.cleanedData
          .map(row => Number(row[col.name]))
          .filter(n => !isNaN(n))
          .slice(0, 500); // limit for perf
      }
    });
    return map;
  }, [analysis]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TableProperties className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('schema.title')}</h2>
          <span className="text-xs text-muted-foreground data-font">({analysis.columns} {t('report.columns')})</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="overflow-x-auto border-t border-border/30">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/30">
                <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('schema.column')}</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('schema.type')}</th>
                <th className="px-4 py-2.5 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('schema.distribution')}</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('schema.unique')}</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('kpi.missing')}</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">{t('schema.stats')}</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">{t('schema.sample')}</th>
              </tr>
            </thead>
            <tbody>
              {analysis.columnInfo.map((col, i) => {
                const sampleValues = analysis.cleanedData
                  .slice(0, 5)
                  .map(row => String(row[col.name] ?? ''))
                  .filter(v => v.length > 0)
                  .slice(0, 3);

                return (
                  <tr key={col.name} className={`border-t border-border/20 ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                    <td className="px-4 py-2.5 font-medium text-foreground text-xs data-font">{col.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${TYPE_BADGES[col.type] || 'bg-muted text-muted-foreground'}`}>
                        {col.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {col.type === 'numeric' && numericValues[col.name]?.length > 0 && (
                        <MiniHistogram values={numericValues[col.name]} />
                      )}
                      {col.type === 'categorical' && col.topValues && col.topValues.length > 0 && (
                        <MiniCategoryBars topValues={col.topValues} />
                      )}
                      {col.type !== 'numeric' && col.type !== 'categorical' && (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground data-font">{col.uniqueCount.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-xs data-font">
                      <span className={col.missingPercent > 20 ? 'text-destructive' : 'text-muted-foreground'}>
                        {col.missingPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                      {col.stats && (
                        <span className="data-font">
                          {col.stats.min.toLocaleString()} — {col.stats.max.toLocaleString()} (μ {col.stats.mean.toFixed(1)})
                        </span>
                      )}
                      {col.topValues && col.topValues.length > 0 && (
                        <span>Top: {col.topValues[0].value} ({col.topValues[0].count})</span>
                      )}
                      {col.dateRange && (
                        <span className="data-font">{col.dateRange.min} → {col.dateRange.max}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell max-w-[200px] truncate data-font">
                      {sampleValues.join(', ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
