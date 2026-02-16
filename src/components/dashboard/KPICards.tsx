import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Columns3, AlertTriangle, CopyMinus, ShieldCheck, Calendar } from 'lucide-react';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import { useI18n } from '@/lib/i18nContext';

interface KPICardsProps {
  analysis: DatasetAnalysis;
}

export default function KPICards({ analysis }: KPICardsProps) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

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

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cardWidth = el.scrollWidth / cards.length;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIdx(Math.min(idx, cards.length - 1));
  };

  return (
    <div>
      {/* Mobile: horizontal swipeable */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-thin pb-2 md:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="glass-card p-4 min-w-[160px] w-[44vw] shrink-0 snap-center"
          >
            <div className="flex items-center gap-2 mb-3">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">{card.label}</span>
            </div>
            <p className={`data-font text-xl font-semibold ${card.special ? card.color.split(' ')[0] : 'text-foreground'} truncate`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Mobile dots indicator */}
      <div className="flex justify-center gap-1.5 mt-2 md:hidden">
        {cards.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIdx ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`}
          />
        ))}
      </div>

      {/* Desktop: grid layout */}
      <div className="hidden md:grid grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }} className="glass-card p-4 group hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider truncate">{card.label}</span>
            </div>
            <p className={`data-font text-xl font-semibold ${card.special ? card.color.split(' ')[0] : 'text-foreground'} truncate`}>{card.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
