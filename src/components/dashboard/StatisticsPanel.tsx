import { motion } from 'framer-motion';
import { BarChart3, Hash, Calendar, Type, Minus, Maximize2, Activity } from 'lucide-react';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import { useI18n } from '@/lib/i18nContext';

interface Props {
  analysis: DatasetAnalysis;
}

export default function StatisticsPanel({ analysis }: Props) {
  const { t } = useI18n();
  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric' && c.stats);
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical' && c.topValues?.length);
  const dateCols = analysis.columnInfo.filter(c => c.type === 'datetime');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 sm:p-5 shadow-lg"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Aniq statistika</h2>
      </div>

      <div className="space-y-4">
        {/* Numeric columns stats */}
        {numCols.map((col, i) => {
          const s = col.stats!;
          return (
            <div key={col.name} className="rounded-lg border border-border/40 bg-secondary/30 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">{col.name}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <StatItem label="Min" value={s.min.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
                <StatItem label="Max" value={s.max.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
                <StatItem label="O'rtacha" value={s.mean.toFixed(2)} />
                <StatItem label="Mediana" value={s.median.toFixed(2)} />
                <StatItem label="Og'ishlar" value={s.outliers.toString()} />
              </div>
            </div>
          );
        })}

        {/* Categorical columns */}
        {catCols.slice(0, 3).map(col => (
          <div key={col.name} className="rounded-lg border border-border/40 bg-secondary/30 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Type className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-foreground">{col.name}</span>
              <span className="text-[10px] text-muted-foreground">({col.uniqueCount} noyob)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {col.topValues!.slice(0, 5).map((v, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-primary/10 text-[11px] font-medium">
                  {v.value} <span className="text-muted-foreground">×{v.count}</span>
                </span>
              ))}
            </div>
          </div>
        ))}

        {/* Date columns */}
        {dateCols.map(col => (
          <div key={col.name} className="rounded-lg border border-border/40 bg-secondary/30 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-3.5 h-3.5 text-chart-5" />
              <span className="text-xs font-semibold text-foreground">{col.name}</span>
            </div>
            {col.dateRange && (
              <p className="text-xs text-muted-foreground tabular-nums">
                {col.dateRange.min} — {col.dateRange.max}
              </p>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="font-bold text-foreground tabular-nums">{value}</span>
    </div>
  );
}
