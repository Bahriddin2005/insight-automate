import { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCompare, Upload, X, ArrowLeftRight, ArrowUp, ArrowDown, Minus, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseFile, analyzeDataset, type DatasetAnalysis, type ColumnInfo } from '@/lib/dataProcessor';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(225, 20%, 9%)', border: '1px solid hsl(220, 15%, 16%)',
    borderRadius: '8px', color: 'hsl(210, 20%, 92%)', fontSize: '13px',
  },
};

interface DiffResult {
  column: string;
  type: string;
  metricA: number;
  metricB: number;
  change: number;
  changePercent: number;
  status: 'added' | 'removed' | 'changed' | 'unchanged';
}

interface Props {
  primaryAnalysis: DatasetAnalysis;
  primaryName: string;
}

export default function DatasetComparison({ primaryAnalysis, primaryName }: Props) {
  const [open, setOpen] = useState(false);
  const [secondaryAnalysis, setSecondaryAnalysis] = useState<DatasetAnalysis | null>(null);
  const [secondaryName, setSecondaryName] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const raw = await parseFile(file, 0);
      const result = analyzeDataset(raw);
      setSecondaryAnalysis(result);
      setSecondaryName(file.name);
    } catch (e) {
      console.error('Compare file error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const diffs = useMemo<DiffResult[]>(() => {
    if (!secondaryAnalysis) return [];
    const results: DiffResult[] = [];
    const allCols = new Set([
      ...primaryAnalysis.columnInfo.map(c => c.name),
      ...secondaryAnalysis.columnInfo.map(c => c.name),
    ]);

    allCols.forEach(col => {
      const a = primaryAnalysis.columnInfo.find(c => c.name === col);
      const b = secondaryAnalysis.columnInfo.find(c => c.name === col);

      if (a && !b) {
        results.push({ column: col, type: a.type, metricA: a.uniqueCount, metricB: 0, change: -a.uniqueCount, changePercent: -100, status: 'removed' });
        return;
      }
      if (!a && b) {
        results.push({ column: col, type: b.type, metricA: 0, metricB: b.uniqueCount, change: b.uniqueCount, changePercent: 100, status: 'added' });
        return;
      }
      if (a && b) {
        // Compare means for numeric, unique counts otherwise
        const valA = a.stats?.mean ?? a.uniqueCount;
        const valB = b.stats?.mean ?? b.uniqueCount;
        const change = valB - valA;
        const pct = valA !== 0 ? (change / Math.abs(valA)) * 100 : valB !== 0 ? 100 : 0;
        results.push({
          column: col,
          type: a.type,
          metricA: +valA.toFixed(2),
          metricB: +valB.toFixed(2),
          change: +change.toFixed(2),
          changePercent: +pct.toFixed(1),
          status: Math.abs(pct) < 1 ? 'unchanged' : 'changed',
        });
      }
    });

    return results.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  }, [primaryAnalysis, secondaryAnalysis]);

  const chartData = useMemo(() => {
    return diffs
      .filter(d => d.status === 'changed' && d.type === 'numeric')
      .slice(0, 10)
      .map(d => ({
        name: d.column.length > 12 ? d.column.slice(0, 12) + '…' : d.column,
        Dataset_A: d.metricA,
        Dataset_B: d.metricB,
      }));
  }, [diffs]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'added': return 'text-green-500';
      case 'removed': return 'text-red-500';
      case 'changed': return 'text-amber-500';
      default: return 'text-muted-foreground';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'added': return <ArrowUp className="w-3 h-3" />;
      case 'removed': return <ArrowDown className="w-3 h-3" />;
      case 'changed': return <ArrowLeftRight className="w-3 h-3" />;
      default: return <Minus className="w-3 h-3" />;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <GitCompare className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Dataset Comparison
            </h2>
            <p className="text-[10px] text-muted-foreground">Compare two datasets side by side</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)} className="text-xs">
          {open ? 'Close' : 'Compare'}
        </Button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            {/* Upload second dataset */}
            {!secondaryAnalysis && (
              <div
                className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                {loading ? (
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload a second dataset to compare</p>
                    <p className="text-[10px] text-muted-foreground mt-1">CSV, XLSX, XLS supported</p>
                  </>
                )}
              </div>
            )}

            {/* Comparison results */}
            {secondaryAnalysis && (
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-secondary/50 p-3 border border-border/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">Dataset A</p>
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate">{primaryName}</p>
                    <p className="text-[10px] text-muted-foreground">{primaryAnalysis.rows.toLocaleString()} rows · {primaryAnalysis.columns} cols · Q: {primaryAnalysis.qualityScore}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3 border border-border/30">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-accent-foreground" />
                        <p className="text-[10px] text-muted-foreground font-medium uppercase">Dataset B</p>
                      </div>
                      <button onClick={() => { setSecondaryAnalysis(null); setSecondaryName(''); }} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate">{secondaryName}</p>
                    <p className="text-[10px] text-muted-foreground">{secondaryAnalysis.rows.toLocaleString()} rows · {secondaryAnalysis.columns} cols · Q: {secondaryAnalysis.qualityScore}</p>
                  </div>
                </div>

                {/* High-level diffs */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-2">
                    <p className="text-lg font-bold text-green-500">{diffs.filter(d => d.status === 'added').length}</p>
                    <p className="text-[10px] text-green-500/70">Added</p>
                  </div>
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2">
                    <p className="text-lg font-bold text-red-500">{diffs.filter(d => d.status === 'removed').length}</p>
                    <p className="text-[10px] text-red-500/70">Removed</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2">
                    <p className="text-lg font-bold text-amber-500">{diffs.filter(d => d.status === 'changed').length}</p>
                    <p className="text-[10px] text-amber-500/70">Changed</p>
                  </div>
                </div>

                {/* Bar chart comparison */}
                {chartData.length > 0 && (
                  <div className="h-56">
                    <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Numeric Column Means — A vs B</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ left: 10, right: 20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 13%)" />
                        <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} angle={-35} textAnchor="end" />
                        <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="Dataset_A" fill="hsl(190, 85%, 48%)" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Dataset_B" fill="hsl(35, 90%, 55%)" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Detailed diff table */}
                <div className="max-h-64 overflow-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary sticky top-0 z-10">
                      <tr>
                        <th className="text-left px-3 py-2 text-muted-foreground">Column</th>
                        <th className="text-left px-2 py-2 text-muted-foreground">Type</th>
                        <th className="text-right px-2 py-2 text-muted-foreground">A</th>
                        <th className="text-right px-2 py-2 text-muted-foreground">B</th>
                        <th className="text-right px-3 py-2 text-muted-foreground">Δ%</th>
                        <th className="text-center px-2 py-2 text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffs.map(d => (
                        <tr key={d.column} className={`border-t border-border/50 ${d.status === 'added' ? 'bg-green-500/5' : d.status === 'removed' ? 'bg-red-500/5' : d.status === 'changed' ? 'bg-amber-500/5' : ''}`}>
                          <td className="px-3 py-1.5 font-medium truncate max-w-[120px]">{d.column}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{d.type}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{d.metricA || '—'}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{d.metricB || '—'}</td>
                          <td className={`px-3 py-1.5 text-right font-mono ${d.changePercent > 0 ? 'text-green-500' : d.changePercent < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {d.changePercent > 0 ? '+' : ''}{d.changePercent}%
                          </td>
                          <td className={`px-2 py-1.5 text-center ${statusColor(d.status)}`}>
                            <span className="inline-flex items-center gap-1">
                              {statusIcon(d.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
