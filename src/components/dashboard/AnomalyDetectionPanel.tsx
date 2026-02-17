import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import type { DatasetAnalysis, ColumnInfo } from '@/lib/dataProcessor';

export interface Anomaly {
  column: string;
  value: number;
  rowIndex: number;
  type: 'spike' | 'drop' | 'outlier';
  severity: 'low' | 'medium' | 'high';
  explanation: string;
  zScore: number;
}

function detectAnomalies(
  data: Record<string, unknown>[],
  columns: ColumnInfo[],
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const numCols = columns.filter(c => c.type === 'numeric' && c.stats);

  for (const col of numCols) {
    const stats = col.stats!;
    const values = data.map((r, i) => ({ val: Number(r[col.name]), idx: i })).filter(v => !isNaN(v.val));
    if (values.length < 5) continue;

    const mean = stats.mean;
    const stdDev = Math.sqrt(values.reduce((s, v) => s + Math.pow(v.val - mean, 2), 0) / values.length);
    if (stdDev === 0) continue;

    for (const { val, idx } of values) {
      const zScore = Math.abs((val - mean) / stdDev);

      if (zScore >= 2.5) {
        const type: Anomaly['type'] = val > mean ? 'spike' : 'drop';
        const severity: Anomaly['severity'] = zScore >= 4 ? 'high' : zScore >= 3 ? 'medium' : 'low';

        const direction = val > mean ? 'above' : 'below';
        const pctDiff = Math.abs(((val - mean) / mean) * 100).toFixed(0);

        anomalies.push({
          column: col.name,
          value: val,
          rowIndex: idx,
          type,
          severity,
          zScore: +zScore.toFixed(2),
          explanation: `${col.name} = ${val.toLocaleString()} is ${pctDiff}% ${direction} mean (${mean.toFixed(1)}). Z-score: ${zScore.toFixed(1)}σ.`,
        });
      }
    }

    // Also check IQR-based outliers for context
    const iqrLower = stats.q1 - 1.5 * stats.iqr;
    const iqrUpper = stats.q3 + 1.5 * stats.iqr;
    for (const { val, idx } of values) {
      if ((val < iqrLower || val > iqrUpper) && !anomalies.find(a => a.rowIndex === idx && a.column === col.name)) {
        anomalies.push({
          column: col.name,
          value: val,
          rowIndex: idx,
          type: 'outlier',
          severity: 'low',
          zScore: Math.abs((val - mean) / stdDev),
          explanation: `${col.name} = ${val.toLocaleString()} is outside IQR bounds [${iqrLower.toFixed(1)}, ${iqrUpper.toFixed(1)}].`,
        });
      }
    }
  }

  // Sort by severity then z-score
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return anomalies
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.zScore - a.zScore)
    .slice(0, 20); // Top 20
}

const severityStyles = {
  high: 'border-red-500/30 bg-red-500/5',
  medium: 'border-orange-500/30 bg-orange-500/5',
  low: 'border-yellow-500/30 bg-yellow-500/5',
};

const severityBadge = {
  high: 'bg-red-500/15 text-red-400',
  medium: 'bg-orange-500/15 text-orange-400',
  low: 'bg-yellow-500/15 text-yellow-400',
};

interface Props {
  analysis: DatasetAnalysis;
  filteredData: Record<string, unknown>[];
}

export default function AnomalyDetectionPanel({ analysis, filteredData }: Props) {
  const anomalies = useMemo(() =>
    detectAnomalies(filteredData, analysis.columnInfo),
    [filteredData, analysis.columnInfo]
  );

  if (anomalies.length === 0) return null;

  const highCount = anomalies.filter(a => a.severity === 'high').length;
  const medCount = anomalies.filter(a => a.severity === 'medium').length;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
            <Zap className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">Anomaly Detection</h3>
            <p className="text-[10px] text-muted-foreground">{anomalies.length} anomalies detected across {new Set(anomalies.map(a => a.column)).size} columns</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {highCount > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">{highCount} critical</span>}
          {medCount > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400">{medCount} warning</span>}
        </div>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        <AnimatePresence>
          {anomalies.map((anomaly, i) => (
            <motion.div
              key={`${anomaly.column}-${anomaly.rowIndex}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${severityStyles[anomaly.severity]}`}
            >
              {anomaly.type === 'spike' ? (
                <TrendingUp className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
              ) : anomaly.type === 'drop' ? (
                <TrendingDown className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-foreground/90">{anomaly.column}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${severityBadge[anomaly.severity]}`}>
                    {anomaly.severity} · {anomaly.zScore}σ
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{anomaly.explanation}</p>
              </div>
              <span className="text-[10px] data-font text-muted-foreground shrink-0">Row {anomaly.rowIndex + 1}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
