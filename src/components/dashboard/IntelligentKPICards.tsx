import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, Percent, Zap, Clock, Cpu, UserCheck, Calendar, Coins } from 'lucide-react';
import { detectIntelligentKPIs, type DetectedKPI } from '@/lib/intelligentKPI';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

const iconMap: Record<string, React.ElementType> = {
  DollarSign, TrendingUp, Activity, Percent, Users, UserCheck,
  Calendar, Zap, Cpu, Clock, Coins, TrendingDown,
};

const categoryColors: Record<string, string> = {
  revenue: 'text-chart-1',
  growth: 'text-chart-2',
  engagement: 'text-chart-3',
  efficiency: 'text-chart-4',
  quality: 'text-chart-5',
  risk: 'text-destructive',
};

interface Props {
  analysis: DatasetAnalysis;
}

export default function IntelligentKPICards({ analysis }: Props) {
  const kpis = useMemo(() => detectIntelligentKPIs(analysis), [analysis]);

  if (kpis.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-3">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        Strategic KPIs (Auto-Detected)
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {kpis.map((kpi, i) => {
          const Icon = iconMap[kpi.icon] || Activity;
          const color = categoryColors[kpi.category] || 'text-foreground';
          return (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="glass-card p-3 sm:p-4 group hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">{kpi.label}</span>
              </div>
              <p className={`data-font text-lg sm:text-xl font-semibold text-foreground truncate`}>{kpi.value}</p>
              {kpi.change && (
                <p className={`text-[10px] mt-1 ${kpi.changeType === 'positive' ? 'text-success' : kpi.changeType === 'negative' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {kpi.change}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
