import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import type { ColumnInfo } from '@/lib/dataProcessor';
import { useI18n } from '@/lib/i18nContext';

const COLORS = [
  'hsl(190, 85%, 48%)', 'hsl(160, 65%, 42%)', 'hsl(35, 90%, 55%)',
  'hsl(280, 65%, 60%)', 'hsl(350, 70%, 55%)', 'hsl(210, 70%, 55%)',
];

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(225, 20%, 9%)', border: '1px solid hsl(220, 15%, 16%)',
    borderRadius: '8px', color: 'hsl(210, 20%, 92%)', fontSize: '13px',
    fontFamily: '"JetBrains Mono", monospace',
  },
};

export interface CustomChartConfig {
  id: string;
  chartType: 'bar' | 'line' | 'pie' | 'area';
  xAxis: string;
  yAxis: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
}

interface ChartCustomizerProps {
  columns: ColumnInfo[];
  data: Record<string, unknown>[];
  customCharts: CustomChartConfig[];
  onAddChart: (config: CustomChartConfig) => void;
  onRemoveChart: (id: string) => void;
}

function aggregateData(data: Record<string, unknown>[], xAxis: string, yAxis: string, agg: string) {
  const groups: Record<string, number[]> = {};
  data.forEach(row => {
    const key = String(row[xAxis] ?? '').slice(0, 20);
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    const val = Number(row[yAxis]);
    if (!isNaN(val)) groups[key].push(val);
  });

  return Object.entries(groups)
    .map(([name, vals]) => {
      let value = 0;
      if (agg === 'count') value = vals.length;
      else if (agg === 'sum') value = vals.reduce((a, b) => a + b, 0);
      else if (agg === 'avg') value = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      else if (agg === 'min') value = Math.min(...vals);
      else if (agg === 'max') value = Math.max(...vals);
      return { name, value: +value.toFixed(2) };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
}

function CustomChart({ config, data, onRemove }: { config: CustomChartConfig; data: Record<string, unknown>[]; onRemove: () => void }) {
  const { t } = useI18n();
  const chartData = aggregateData(data, config.xAxis, config.yAxis, config.aggregation);
  const title = `${config.xAxis} × ${config.yAxis} (${t(`chart.${config.aggregation}`)})`;

  const renderChart = () => {
    if (config.chartType === 'pie') {
      return (
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" outerRadius="75%" innerRadius="40%" dataKey="value" nameKey="name" paddingAngle={2} strokeWidth={0}>
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />)}
          </Pie>
          <Tooltip {...tooltipStyle} />
        </PieChart>
      );
    }
    if (config.chartType === 'line') {
      return (
        <LineChart data={chartData} margin={{ left: 10, right: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 13%)" />
          <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} angle={-35} textAnchor="end" />
          <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} />
          <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} dot={false} />
        </LineChart>
      );
    }
    if (config.chartType === 'area') {
      return (
        <AreaChart data={chartData} margin={{ left: 10, right: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 13%)" />
          <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} angle={-35} textAnchor="end" />
          <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} />
          <Tooltip {...tooltipStyle} />
          <Area type="monotone" dataKey="value" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.2} />
        </AreaChart>
      );
    }
    return (
      <BarChart data={chartData} margin={{ left: 10, right: 20, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 13%)" />
        <XAxis dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 10 }} angle={-35} textAnchor="end" />
        <YAxis tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />)}
        </Bar>
      </BarChart>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-5 relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider truncate pr-2">{title}</h3>
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors shrink-0"><X className="w-4 h-4" /></button>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">{renderChart()}</ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export default function ChartCustomizer({ columns, data, customCharts, onAddChart, onRemoveChart }: ChartCustomizerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [chartType, setChartType] = useState<CustomChartConfig['chartType']>('bar');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [aggregation, setAggregation] = useState<CustomChartConfig['aggregation']>('count');

  const allCols = columns.filter(c => c.type !== 'id');
  const numCols = columns.filter(c => c.type === 'numeric');

  const handleAdd = () => {
    if (!xAxis || !yAxis) return;
    onAddChart({ id: Date.now().toString(), chartType, xAxis, yAxis, aggregation });
    setOpen(false);
  };

  const selectClass = "bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-2 border border-border focus:ring-1 focus:ring-primary outline-none w-full";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('chart.custom')}</h2>
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)} className="text-xs">
          {open ? <X className="w-3 h-3 mr-1.5" /> : <Settings2 className="w-3 h-3 mr-1.5" />}
          {t('chart.customize')}
        </Button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass-card p-4 overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('chart.type')}</label>
                <select value={chartType} onChange={e => setChartType(e.target.value as CustomChartConfig['chartType'])} className={selectClass}>
                  <option value="bar">{t('chart.bar')}</option>
                  <option value="line">{t('chart.line')}</option>
                  <option value="pie">{t('chart.pie')}</option>
                  <option value="area">{t('chart.area')}</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('chart.xAxis')}</label>
                <select value={xAxis} onChange={e => setXAxis(e.target.value)} className={selectClass}>
                  <option value="">{t('chart.selectCol')}</option>
                  {allCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('chart.yAxis')}</label>
                <select value={yAxis} onChange={e => setYAxis(e.target.value)} className={selectClass}>
                  <option value="">{t('chart.selectCol')}</option>
                  {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('chart.aggregation')}</label>
                <select value={aggregation} onChange={e => setAggregation(e.target.value as CustomChartConfig['aggregation'])} className={selectClass}>
                  <option value="count">{t('chart.count')}</option>
                  <option value="sum">{t('chart.sum')}</option>
                  <option value="avg">{t('chart.avg')}</option>
                  <option value="min">{t('chart.min')}</option>
                  <option value="max">{t('chart.max')}</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleAdd} disabled={!xAxis || !yAxis} className="w-full gradient-primary text-primary-foreground text-xs h-9">
                  <Plus className="w-3 h-3 mr-1" /> {t('chart.add')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {customCharts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {customCharts.map(config => (
              <CustomChart key={config.id} config={config} data={data} onRemove={() => onRemoveChart(config.id)} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
