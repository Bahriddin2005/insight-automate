import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getCorrelationMatrix } from '@/lib/dataProcessor';
import { useI18n } from '@/lib/i18nContext';

interface CorrelationHeatmapProps {
  data: Record<string, unknown>[];
  numericColumns: string[];
}

function getColor(value: number): string {
  if (value >= 0.7) return 'bg-chart-2/80';
  if (value >= 0.4) return 'bg-chart-2/40';
  if (value >= 0.1) return 'bg-chart-2/20';
  if (value > -0.1) return 'bg-muted/50';
  if (value > -0.4) return 'bg-chart-5/20';
  if (value > -0.7) return 'bg-chart-5/40';
  return 'bg-chart-5/80';
}

export default function CorrelationHeatmap({ data, numericColumns }: CorrelationHeatmapProps) {
  const { t } = useI18n();

  const { columns, matrix } = useMemo(
    () => getCorrelationMatrix(data, numericColumns.slice(0, 8)),
    [data, numericColumns]
  );

  if (columns.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="glass-card p-5"
    >
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
        {t('chart.correlation')}
      </h3>

      <div className="overflow-x-auto scrollbar-thin">
        <div className="inline-block">
          {/* Header row */}
          <div className="flex">
            <div className="w-24 shrink-0" />
            {columns.map(col => (
              <div key={col} className="w-16 h-8 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[60px] -rotate-45 origin-center">
                  {col.length > 8 ? col.slice(0, 8) + '…' : col}
                </span>
              </div>
            ))}
          </div>

          {/* Data rows */}
          {matrix.map((row, i) => (
            <div key={columns[i]} className="flex">
              <div className="w-24 shrink-0 flex items-center pr-2">
                <span className="text-[10px] text-muted-foreground font-medium truncate">
                  {columns[i].length > 12 ? columns[i].slice(0, 12) + '…' : columns[i]}
                </span>
              </div>
              {row.map((value, j) => (
                <div
                  key={j}
                  className={`w-16 h-12 flex items-center justify-center rounded-md m-0.5 transition-colors ${getColor(value)}`}
                  title={`${columns[i]} × ${columns[j]}: ${value}`}
                >
                  <span className="data-font text-[11px] font-medium text-foreground/80">
                    {value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/30">
            <span className="text-[10px] text-muted-foreground">-1.0</span>
            <div className="flex gap-0.5">
              <div className="w-6 h-3 rounded-sm bg-chart-5/80" />
              <div className="w-6 h-3 rounded-sm bg-chart-5/40" />
              <div className="w-6 h-3 rounded-sm bg-chart-5/20" />
              <div className="w-6 h-3 rounded-sm bg-muted/50" />
              <div className="w-6 h-3 rounded-sm bg-chart-2/20" />
              <div className="w-6 h-3 rounded-sm bg-chart-2/40" />
              <div className="w-6 h-3 rounded-sm bg-chart-2/80" />
            </div>
            <span className="text-[10px] text-muted-foreground">+1.0</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
