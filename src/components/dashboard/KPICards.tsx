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

  const scoreColor = analysis.qualityScore >= 85 ? 'text-[#22c55e]'
    : analysis.qualityScore >= 60 ? 'text-[#f59e0b]'
    : 'text-[#ef4444]';

  const cards = [
    { label: t('kpi.totalRows'), value: analysis.rows.toLocaleString(), icon: Database, color: 'from-[hsl(190,85%,48%)]/20 to-[hsl(190,85%,48%)]/5', borderColor: 'border-[hsl(190,85%,48%)]/40' },
    { label: t('kpi.totalColumns'), value: analysis.columns.toString(), icon: Columns3, color: 'from-[hsl(160,65%,42%)]/20 to-[hsl(160,65%,42%)]/5', borderColor: 'border-[hsl(160,65%,42%)]/40' },
    { label: t('kpi.missing'), value: `${analysis.missingPercent}%`, icon: AlertTriangle, color: 'from-[hsl(35,90%,55%)]/20 to-[hsl(35,90%,55%)]/5', borderColor: 'border-[hsl(35,90%,55%)]/40' },
    { label: t('kpi.duplicates'), value: analysis.duplicatesRemoved.toString(), icon: CopyMinus, color: 'from-[hsl(280,65%,60%)]/20 to-[hsl(280,65%,60%)]/5', borderColor: 'border-[hsl(280,65%,60%)]/40' },
    { label: t('kpi.quality'), value: `${analysis.qualityScore}/100`, icon: ShieldCheck, color: analysis.qualityScore >= 85 ? 'from-[hsl(160,65%,42%)]/30 to-[hsl(160,65%,42%)]/5' : analysis.qualityScore >= 60 ? 'from-[hsl(35,90%,55%)]/30 to-[hsl(35,90%,55%)]/5' : 'from-destructive/20 to-destructive/5', borderColor: analysis.qualityScore >= 85 ? 'border-[hsl(160,65%,42%)]/50' : analysis.qualityScore >= 60 ? 'border-[hsl(35,90%,55%)]/50' : 'border-destructive/40', special: true },
    ...(analysis.dateRange ? [{
      label: t('kpi.dateRange'), value: `${analysis.dateRange.min} → ${analysis.dateRange.max}`, icon: Calendar, color: 'from-[hsl(350,70%,55%)]/20 to-[hsl(350,70%,55%)]/5', borderColor: 'border-[hsl(350,70%,55%)]/40', special: false as boolean,
    }] : []),
  ];

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cardWidth = el.scrollWidth / cards.length;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIdx(Math.min(idx, cards.length - 1));
  };

  const Card = ({ card, i, mobile = false }: { card: typeof cards[0]; i: number; mobile?: boolean }) => (
    <motion.div
      key={card.label}
      initial={{ opacity: 0, [mobile ? 'scale' : 'y']: mobile ? 0.94 : 16 }}
      animate={{ opacity: 1, [mobile ? 'scale' : 'y']: 1 }}
      transition={{ duration: 0.35, delay: i * 0.06 }}
      className={`exec-card exec-kpi-card p-5 transition-all hover:shadow-md ${mobile ? 'min-w-[165px] w-[46vw] shrink-0 snap-center' : ''}`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-8 h-8 rounded bg-[#4472C4]/10 flex items-center justify-center`}>
          <card.icon className={`w-4 h-4 ${card.special ? scoreColor : 'text-[#4472C4]'}`} />
        </div>
        <span className="exec-label text-[10px] sm:text-xs font-semibold truncate">{card.label}</span>
      </div>
      <p className="exec-period text-[10px]">THIS MONTH</p>
      <p className={`exec-value text-xl sm:text-2xl tabular-nums mt-1 ${card.special ? scoreColor : ''}`}>{card.value}</p>
    </motion.div>
  );

  return (
    <div>
      {/* Mobile: horizontal swipeable */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-thin pb-3 md:hidden px-0.5"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {cards.map((card, i) => <Card key={card.label} card={card} i={i} mobile />)}
      </div>
      <div className="flex justify-center gap-2 mt-3 md:hidden">
        {cards.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIdx ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`} />
        ))}
      </div>
      {/* Desktop: grid */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card, i) => <Card key={card.label} card={card} i={i} />)}
      </div>
    </div>
  );
}
