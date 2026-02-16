import { motion } from 'framer-motion';
import { Database, Columns3, AlertTriangle, CopyMinus, ShieldCheck, Calendar } from 'lucide-react';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import { useI18n } from '@/lib/i18nContext';

interface KPICardsProps {
  analysis: DatasetAnalysis;
}

export default function KPICards({ analysis }: KPICardsProps) {
  const { t } = useI18n();
  const scoreColor = analysis.qualityScore >= 85 ? 'text-success glow-success'
    : analysis.qualityScore >= 60 ? 'text-warning glow-warning'
    : 'text-destructive glow-destructive';

  const cards = [
    { label: t('kpi.totalRows'), value: analysis.rows.toLocaleString(), icon: Database, color: 'text-chart-1' },
    { label: t('kpi.totalColumns'), value: analysis.columns.toString(), icon: Columns3, color: 'text-chart-2' },
    { label: t('kpi.missing'), value: `${analysis.missingPercent}%`, icon: AlertTriangle, color: 'text-chart-3' },
    { label: t('kpi.duplicates'), value: analysis.duplicatesRemoved.toString(), icon: CopyMinus, color: 'text-chart-4' },
    { label: t('kpi.quality'), value: `${analysis.qualityScore}/100`, icon: ShieldCheck, color: scoreColor, special: true },
    ...(analysis.dateRange ? [{
      label: t('kpi.dateRange'), value: `${analysis.dateRange.min} → ${analysis.dateRange.max}`, icon: Calendar, color: 'text-chart-5',
    }] : []),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
      {cards.map((card, i) => (
        <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }} className="glass-card p-3 sm:p-4 group hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <card.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${card.color}`} />
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider truncate">{card.label}</span>
          </div>
          <p className={`data-font text-base sm:text-xl font-semibold ${card.special ? card.color.split(' ')[0] : 'text-foreground'} truncate`}>{card.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
