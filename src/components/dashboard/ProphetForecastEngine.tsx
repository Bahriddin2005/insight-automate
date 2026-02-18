import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Loader2, BarChart3,
  Calendar, Activity, Target, ChevronDown, ChevronUp, RefreshCw, Zap,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, ReferenceLine, Scatter,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { DatasetAnalysis, ColumnInfo } from '@/lib/dataProcessor';

function findCol(columns: ColumnInfo[], aliases: string[]): ColumnInfo | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[_\s-]+/g, ' ').trim();
  for (const a of aliases.map(norm)) {
    const f = columns.find(c => norm(c.name) === a || norm(c.name).includes(a));
    if (f) return f;
  }
  return undefined;
}

interface ForecastResult {
  forecast: { ds: string; yhat: number; yhat_lower: number; yhat_upper: number }[];
  trend: { direction: string; strength: number; daily_change: number; growth_rate_percent: number };
  seasonality: { has_weekly: boolean; has_monthly: boolean; has_yearly: boolean; dominant_period: string; peak_day_of_week: string | null; peak_month: string | null };
  changepoints: { date: string; type: string; magnitude: number }[];
  anomalies: { date: string; value: number; expected: number; severity: string }[];
  summary: { title: string; insights: string[]; risk_level: string; risk_reason: string; recommendation: string };
  model_confidence: number;
  mape: number;
}

interface Props {
  analysis: DatasetAnalysis;
  filteredData: Record<string, unknown>[];
}

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '12px',
    color: 'hsl(var(--foreground))',
    fontSize: '11px',
    fontFamily: '"JetBrains Mono", monospace',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
};

export default function ProphetForecastEngine({ analysis, filteredData }: Props) {
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forecastDays, setForecastDays] = useState(30);
  const [showDetails, setShowDetails] = useState(false);

  const dateCol = useMemo(() =>
    findCol(analysis.columnInfo.filter(c => c.type === 'datetime'), ['date', 'timestamp', 'created at', 'time', 'order date', 'day', 'month']),
    [analysis.columnInfo]
  );
  const numCol = useMemo(() =>
    findCol(analysis.columnInfo.filter(c => c.type === 'numeric'), ['revenue', 'sales', 'amount', 'total', 'income', 'count', 'value', 'price', 'profit']),
    [analysis.columnInfo]
  );

  // Prepare time series from data
  const timeSeries = useMemo(() => {
    if (!dateCol || !numCol) return null;
    const dailyMap: Record<string, number> = {};
    filteredData.forEach(r => {
      const d = new Date(String(r[dateCol.name]));
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = (dailyMap[key] || 0) + (Number(r[numCol.name]) || 0);
    });
    return Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ds, y]) => ({ ds, y: +y.toFixed(2) }));
  }, [filteredData, dateCol, numCol]);

  const runForecast = useCallback(async () => {
    if (!timeSeries || timeSeries.length < 7) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('prophet-forecast', {
        body: { timeSeries, forecastDays, metricName: numCol?.name || 'metric', language: 'uz' },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setForecast(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prognoz xatoligi');
    } finally {
      setLoading(false);
    }
  }, [timeSeries, forecastDays, numCol]);

  // Build chart data
  const chartData = useMemo(() => {
    if (!timeSeries) return [];
    const historical = timeSeries.map(p => ({
      date: p.ds.slice(5),
      fullDate: p.ds,
      actual: p.y,
      forecast: undefined as number | undefined,
      upper: undefined as number | undefined,
      lower: undefined as number | undefined,
      anomaly: undefined as number | undefined,
    }));

    if (forecast) {
      // Mark anomalies on historical data
      forecast.anomalies?.forEach(a => {
        const idx = historical.findIndex(h => h.fullDate === a.date);
        if (idx >= 0) historical[idx].anomaly = historical[idx].actual;
      });

      // Add forecast data
      forecast.forecast.forEach(f => {
        historical.push({
          date: f.ds.slice(5),
          fullDate: f.ds,
          actual: undefined as unknown as number,
          forecast: f.yhat,
          upper: f.yhat_upper,
          lower: f.yhat_lower,
          anomaly: undefined,
        });
      });
    }

    return historical;
  }, [timeSeries, forecast]);

  if (!dateCol || !numCol) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        <div className="flex items-center gap-3 text-muted-foreground">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">Prognoz bo'limi yoqilmadi</p>
            <p className="text-xs">Vaqt ustuni yoki raqamli ko'rsatkich aniqlanmadi.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!timeSeries || timeSeries.length < 7) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Calendar className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">Yetarli ma'lumot yo'q</p>
            <p className="text-xs">Prognoz uchun kamida 7 ta vaqt nuqtasi kerak ({timeSeries?.length || 0} ta topildi).</p>
          </div>
        </div>
      </motion.div>
    );
  }

  const TrendIcon = forecast?.trend.direction === 'up' ? TrendingUp : forecast?.trend.direction === 'down' ? TrendingDown : Minus;
  const trendColor = forecast?.trend.direction === 'up' ? 'text-emerald-400' : forecast?.trend.direction === 'down' ? 'text-red-400' : 'text-muted-foreground';
  const riskColors: Record<string, string> = { low: 'text-emerald-400 bg-emerald-400/10', medium: 'text-amber-400 bg-amber-400/10', high: 'text-red-400 bg-red-400/10' };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Prophet Forecast Engine</h3>
            <p className="text-[10px] text-muted-foreground">
              {numCol.name} — AI-powered time series forecasting
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={forecastDays}
            onChange={e => setForecastDays(Number(e.target.value))}
            className="bg-secondary text-secondary-foreground text-xs rounded-lg px-2 py-1.5 border border-border"
          >
            <option value={7}>7 kun</option>
            <option value={14}>14 kun</option>
            <option value={30}>30 kun</option>
            <option value={60}>60 kun</option>
            <option value={90}>90 kun</option>
          </select>
          <Button
            size="sm"
            onClick={runForecast}
            disabled={loading}
            className="text-xs gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {loading ? 'Hisoblash...' : forecast ? 'Qayta hisoblash' : 'Prognoz qilish'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mb-3 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {/* Chart */}
      <div className="px-5 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ left: 5, right: 15, bottom: 5 }}>
            <defs>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(280, 65%, 60%)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(280, 65%, 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(190, 85%, 48%)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(190, 85%, 48%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.2)" />
            <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />

            {/* Confidence band */}
            <Area type="monotone" dataKey="upper" name="Yuqori chegara" stroke="none" fill="hsl(280, 65%, 60%)" fillOpacity={0.08} />
            <Area type="monotone" dataKey="lower" name="Pastki chegara" stroke="none" fill="hsl(280, 65%, 60%)" fillOpacity={0.08} />

            {/* Historical data */}
            <Area type="monotone" dataKey="actual" name="Haqiqiy" stroke="hsl(190, 85%, 48%)" fill="url(#actualGradient)" strokeWidth={2} dot={false} connectNulls={false} />

            {/* Forecast */}
            <Line type="monotone" dataKey="forecast" name="Prognoz" stroke="hsl(280, 65%, 60%)" strokeWidth={2.5} dot={{ r: 2 }} connectNulls={false} />

            {/* Anomalies */}
            <Scatter name="Anomaliya" dataKey="anomaly" fill="hsl(0, 85%, 60%)" shape="diamond" />

            {/* Separator */}
            {forecast && timeSeries && (
              <ReferenceLine
                x={timeSeries[timeSeries.length - 1].ds.slice(5)}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                label={{ value: 'Prognoz →', position: 'top', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Forecast Stats */}
      <AnimatePresence>
        {forecast && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="px-5 pb-5 space-y-4">
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Trend</p>
                <div className={`flex items-center justify-center gap-1 mt-1 ${trendColor}`}>
                  <TrendIcon className="w-4 h-4" />
                  <span className="text-lg font-bold data-font">
                    {forecast.trend.growth_rate_percent >= 0 ? '+' : ''}{forecast.trend.growth_rate_percent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aniqlik</p>
                <p className={`text-lg font-bold data-font mt-1 ${forecast.model_confidence >= 0.7 ? 'text-emerald-400' : forecast.model_confidence >= 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
                  {(forecast.model_confidence * 100).toFixed(0)}%
                </p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">MAPE</p>
                <p className="text-lg font-bold data-font text-foreground mt-1">
                  {forecast.mape.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk</p>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${riskColors[forecast.summary.risk_level] || ''}`}>
                  {forecast.summary.risk_level === 'high' && <AlertTriangle className="w-3 h-3" />}
                  {forecast.summary.risk_level.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Seasonality chips */}
            <div className="flex flex-wrap gap-2">
              {forecast.seasonality.has_weekly && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 font-medium">📅 Haftalik pattern</span>
              )}
              {forecast.seasonality.has_monthly && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 font-medium">📆 Oylik pattern</span>
              )}
              {forecast.seasonality.has_yearly && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-medium">🗓 Yillik pattern</span>
              )}
              {forecast.seasonality.peak_day_of_week && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">Peak: {forecast.seasonality.peak_day_of_week}</span>
              )}
              {forecast.anomalies.length > 0 && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 font-medium">⚠ {forecast.anomalies.length} anomaliya</span>
              )}
            </div>

            {/* Expandable Details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors text-xs text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Batafsil tahlil va tavsiyalar
              </span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  {/* Summary */}
                  <div className="rounded-xl bg-muted/20 p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-violet-400" />
                      {forecast.summary.title}
                    </h4>
                    <ul className="space-y-1.5">
                      {forecast.summary.insights.map((insight, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-violet-400 mt-0.5">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                    {forecast.summary.risk_reason && (
                      <p className="text-xs text-amber-400/80 flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        {forecast.summary.risk_reason}
                      </p>
                    )}
                    <div className="pt-2 border-t border-border/30">
                      <p className="text-xs text-emerald-400/80 flex items-start gap-1.5">
                        <BarChart3 className="w-3 h-3 mt-0.5 shrink-0" />
                        <strong>Tavsiya:</strong> {forecast.summary.recommendation}
                      </p>
                    </div>
                  </div>

                  {/* Change points */}
                  {forecast.changepoints.length > 0 && (
                    <div className="rounded-xl bg-muted/20 p-4">
                      <h4 className="text-xs font-semibold text-foreground mb-2">O'zgarish nuqtalari</h4>
                      <div className="space-y-1.5">
                        {forecast.changepoints.map((cp, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground data-font">{cp.date}</span>
                            <span className={cp.type === 'increase' ? 'text-emerald-400' : 'text-red-400'}>
                              {cp.type === 'increase' ? '↑' : '↓'} {cp.magnitude.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initial state - no forecast yet */}
      {!forecast && !loading && (
        <div className="px-5 pb-5 pt-2">
          <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
            <Zap className="w-8 h-8 text-violet-400/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {timeSeries.length} ta vaqt nuqtasi aniqlandi
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              "Prognoz qilish" tugmasini bosing — AI modelingiz {forecastDays} kunlik bashorat qiladi
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
