import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, X, MessageSquare, BarChart3, LineChart, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18nContext';
import { toast } from '@/hooks/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart as RLineChart, Line, CartesianGrid, PieChart as RPieChart, Pie, Cell,
  ScatterChart, Scatter,
} from 'recharts';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

const COLORS = [
  'hsl(190, 85%, 48%)', 'hsl(160, 65%, 42%)', 'hsl(35, 90%, 55%)',
  'hsl(280, 65%, 60%)', 'hsl(350, 70%, 55%)', 'hsl(210, 70%, 55%)',
];

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(225, 20%, 9%)', border: '1px solid hsl(220, 15%, 16%)',
    borderRadius: '8px', color: 'hsl(210, 20%, 92%)', fontSize: '13px',
  },
};

interface NLQueryResult {
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
  title: string;
  xAxis: string;
  yAxis: string;
  aggregation: string;
  groupBy?: string;
  filter?: { column: string; value: string } | null;
  explanation: string;
}

interface Props {
  analysis: DatasetAnalysis;
  filteredData: Record<string, unknown>[];
}

const SUGGESTIONS = [
  'Show me revenue by month',
  'What are the top 5 categories?',
  'Compare cost vs revenue',
  'Show distribution of status',
];

export default function NaturalLanguageQuery({ analysis, filteredData }: Props) {
  const { lang } = useI18n();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NLQueryResult | null>(null);
  const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  const buildContext = useCallback(() => {
    const cols = analysis.columnInfo.map(c =>
      `${c.name} (${c.type}${c.stats ? `, min=${c.stats.min}, max=${c.stats.max}, mean=${c.stats.mean.toFixed(2)}` : ''}${c.topValues ? `, values=[${c.topValues.slice(0, 5).map(v => v.value).join(', ')}]` : ''})`
    ).join('\n');
    return `Columns:\n${cols}\nRows: ${analysis.rows}, Date range: ${analysis.dateRange?.min || 'N/A'} to ${analysis.dateRange?.max || 'N/A'}`;
  }, [analysis]);

  const aggregate = useCallback((data: Record<string, unknown>[], config: NLQueryResult) => {
    const { xAxis, yAxis, aggregation, groupBy, filter } = config;
    let filtered = data;
    if (filter?.column && filter?.value) {
      filtered = data.filter(r => String(r[filter.column]) === filter.value);
    }

    const key = groupBy || xAxis;
    if (!key) return filtered.slice(0, 50);

    const groups: Record<string, number[]> = {};
    filtered.forEach(row => {
      const k = String(row[key] || 'Unknown');
      const v = Number(row[yAxis] || 0);
      if (!groups[k]) groups[k] = [];
      if (!isNaN(v)) groups[k].push(v);
    });

    return Object.entries(groups).map(([name, vals]) => {
      let value = 0;
      switch (aggregation) {
        case 'sum': value = vals.reduce((a, b) => a + b, 0); break;
        case 'avg': value = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0; break;
        case 'count': value = vals.length; break;
        case 'max': value = Math.max(...vals); break;
        case 'min': value = Math.min(...vals); break;
        default: value = vals.reduce((a, b) => a + b, 0);
      }
      return { name: name.length > 16 ? name.slice(0, 16) + '…' : name, value: +value.toFixed(2) };
    }).sort((a, b) => b.value - a.value).slice(0, 20);
  }, []);

  const handleQuery = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('nl-query', {
        body: { query: q, datasetContext: buildContext(), language: lang },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const config = data as NLQueryResult;
      setResult(config);
      const aggregated = aggregate(filteredData, config);
      setChartData(aggregated);
      setHistory(prev => [q, ...prev.filter(h => h !== q)].slice(0, 10));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Query failed';
      toast({ title: 'Query Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [buildContext, lang, filteredData, aggregate]);

  const renderChart = () => {
    if (!result || chartData.length === 0) return null;

    switch (result.chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ left: 10, right: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 13%)" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} angle={-35} textAnchor="end" />
              <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={280}>
            <RLineChart data={chartData} margin={{ left: 10, right: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 13%)" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} dot={false} />
            </RLineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={280}>
            <RPieChart>
              <Pie data={chartData} cx="50%" cy="50%" outerRadius="75%" innerRadius="40%" dataKey="value" nameKey="name" paddingAngle={2} strokeWidth={0}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />)}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </RPieChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 13%)" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} />
              <YAxis dataKey="value" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Scatter data={chartData} fill={COLORS[0]} fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'table':
        return (
          <div className="max-h-64 overflow-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-secondary sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-muted-foreground">Name</th>
                  <th className="text-right px-3 py-2 text-muted-foreground">Value</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, i) => (
                  <tr key={i} className="border-t border-border/50 hover:bg-accent/30">
                    <td className="px-3 py-1.5">{String(row.name)}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{String(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  const chartIcon = result?.chartType === 'line' ? <LineChart className="w-4 h-4" /> :
    result?.chartType === 'pie' ? <PieChart className="w-4 h-4" /> :
    <BarChart3 className="w-4 h-4" />;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Natural Language Query
        </h2>
      </div>

      {/* Search input */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuery(query)}
            placeholder="Ask a question about your data..."
            className="pl-9 text-sm bg-secondary border-border"
          />
        </div>
        <Button onClick={() => handleQuery(query)} disabled={loading || !query.trim()} size="sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}
        </Button>
      </div>

      {/* Suggestions */}
      {!result && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => { setQuery(s); handleQuery(s); }}
              className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors border border-border/50">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Result */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {chartIcon}
                <h3 className="text-sm font-semibold text-foreground">{result.title}</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setResult(null); setChartData([]); }}>
                <X className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{result.explanation}</p>
            {renderChart()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && !result && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground mb-1.5">Recent queries</p>
          <div className="flex flex-wrap gap-1">
            {history.slice(0, 5).map(h => (
              <button key={h} onClick={() => { setQuery(h); handleQuery(h); }}
                className="text-[10px] px-2 py-0.5 rounded bg-accent/50 text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]">
                {h}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
