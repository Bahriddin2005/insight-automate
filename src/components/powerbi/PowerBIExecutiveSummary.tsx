/**
 * Executive Summary Panel — Strategic briefing style
 * Dark luxury / Board presentation mode
 */

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { sumFiltered, momGrowth } from '@/lib/powerBiCalculations';
import { formatExecutive } from '@/lib/formatNumber';
import type { FilterContext } from '@/lib/powerBiCalculations';
import type { PbiColumn } from '@/lib/powerBiModel';

interface Props {
  data: Record<string, unknown>[];
  filters: FilterContext;
  numCols: PbiColumn[];
  catCols: PbiColumn[];
  dateCol: PbiColumn | null;
  boardMode?: boolean;
}

export default function PowerBIExecutiveSummary({ data, filters, numCols, catCols, dateCol, boardMode = false }: Props) {
  const insights = useMemo(() => {
    const list: { text: string; type: 'positive' | 'negative' | 'neutral' | 'warning' }[] = [];
    const revCol = numCols.find(c => /revenue|sales|amount/i.test(c.name)) ?? numCols[0];
    const total = revCol ? sumFiltered(data, revCol.name, filters) : data.length;

    if (revCol && dateCol) {
      const growth = momGrowth(data, revCol.name, dateCol.name, filters);
      if (growth > 0) list.push({ text: `${revCol.name} increased ${growth.toFixed(1)}% MoM`, type: 'positive' });
      else if (growth < 0) list.push({ text: `${revCol.name} decreased ${Math.abs(growth).toFixed(1)}% MoM`, type: 'negative' });
    }

    if (numCols.length >= 2) {
      const costCol = numCols.find(c => /cost|expense/i.test(c.name));
      if (costCol && revCol) {
        const cost = sumFiltered(data, costCol.name, filters);
        const ratio = total ? (cost / total) * 100 : 0;
        const margin = 100 - ratio;
        list.push({ text: `Margin stable at ${margin.toFixed(0)}%`, type: 'neutral' });
      }
    }

    if (catCols.length > 0) {
      const regionCol = catCols.find(c => /region|country|category/i.test(c.name)) ?? catCols[0];
      if (regionCol && revCol) {
        const byCat: Record<string, number> = {};
        data.forEach(r => {
          const k = String(r[regionCol.name] ?? '');
          byCat[k] = (byCat[k] || 0) + (Number(r[revCol.name]) || 0);
        });
        const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
        if (sorted.length >= 2) {
          const top = sorted[0][1];
          const last = sorted[sorted.length - 1][1];
          const pct = top ? ((last - top) / top) * 100 : 0;
          if (pct < -15) list.push({ text: `Regional performance uneven in ${sorted[sorted.length - 1][0]}`, type: 'warning' });
        }
      }
    }

    return list.length ? list : [{ text: `Total: ${formatExecutive(total)} rows analyzed`, type: 'neutral' as const }];
  }, [data, filters, numCols, catCols, dateCol]);

  const Icon = (type: string) => {
    switch (type) {
      case 'positive': return TrendingUp;
      case 'negative': return TrendingDown;
      case 'warning': return AlertCircle;
      default: return Minus;
    }
  };

  const colorMap = { positive: 'text-[#14F195]', negative: 'text-[#FF4D4F]', neutral: 'text-[#9CA3AF]', warning: 'text-[#C8A24D]' };

  return (
    <div className={boardMode ? 'dlux-insight-panel' : 'dlux-insight-panel'}>
      <h3 className="dlux-insight-title">{boardMode ? 'Strategic Briefing' : 'Executive Summary'}</h3>
      <div className="space-y-0">
        {insights.map((item, i) => {
          const I = Icon(item.type);
          return (
            <div key={i} className="dlux-insight-item">
              <I className={`w-4 h-4 shrink-0 mt-0.5 ${colorMap[item.type]}`} />
              <span className={`text-sm ${boardMode ? 'font-medium' : ''} ${colorMap[item.type]}`}>{item.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
