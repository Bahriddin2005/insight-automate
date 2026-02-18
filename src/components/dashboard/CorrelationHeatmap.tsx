import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getCorrelationMatrix } from '@/lib/dataProcessor';
import { useI18n } from '@/lib/i18nContext';

interface CorrelationHeatmapProps {
  data: Record<string, unknown>[];
  numericColumns: string[];
}

// Viridis-inspired diverging palette: dark purple → teal → yellow
function getViridisColor(value: number): string {
  // Map correlation [-1, 1] to a viridis-like scale
  const t = (value + 1) / 2; // normalize to [0, 1]
  if (t <= 0.1) return 'hsl(280, 70%, 20%)';
  if (t <= 0.2) return 'hsl(265, 55%, 30%)';
  if (t <= 0.3) return 'hsl(240, 45%, 38%)';
  if (t <= 0.4) return 'hsl(215, 50%, 40%)';
  if (t <= 0.5) return 'hsl(190, 55%, 40%)';
  if (t <= 0.6) return 'hsl(170, 55%, 42%)';
  if (t <= 0.7) return 'hsl(140, 55%, 45%)';
  if (t <= 0.8) return 'hsl(100, 60%, 48%)';
  if (t <= 0.9) return 'hsl(65, 70%, 50%)';
  return 'hsl(50, 85%, 55%)';
}

function getTextColor(value: number): string {
  const t = (value + 1) / 2;
  return t < 0.3 || t > 0.85 ? 'hsl(0, 0%, 95%)' : 'hsl(0, 0%, 10%)';
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
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground/90 tracking-wide">
          {t('chart.correlation')}
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Viridis color scale · Pearson r</p>
      </div>

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
                  className="w-16 h-12 flex items-center justify-center rounded-sm m-0.5 transition-all hover:scale-110 hover:z-10 cursor-default"
                  style={{ backgroundColor: getViridisColor(value) }}
                  title={`${columns[i]} × ${columns[j]}: ${value.toFixed(3)}`}
                >
                  <span className="data-font text-[11px] font-semibold" style={{ color: getTextColor(value) }}>
                    {value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ))}

          {/* Viridis legend */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/30">
            <span className="text-[10px] text-muted-foreground font-medium">-1.0</span>
            <div className="flex gap-0">
              {Array.from({ length: 10 }, (_, i) => {
                const val = -1 + i * 0.2;
                return (
                  <div key={i} className="w-5 h-3 first:rounded-l-sm last:rounded-r-sm"
                    style={{ backgroundColor: getViridisColor(val) }} />
                );
              })}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">+1.0</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
