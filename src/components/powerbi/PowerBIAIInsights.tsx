/**
 * AI Strategic Insights Panel — Glassmorphism
 * Anomaly, underperforming metric, suggested action, confidence level
 */

import { useMemo } from 'react';
import { AlertTriangle, TrendingDown, Lightbulb, Target } from 'lucide-react';
import { formatExecutive } from '@/lib/formatNumber';
import { sumFiltered, momGrowth } from '@/lib/powerBiCalculations';
import type { FilterContext } from '@/lib/powerBiCalculations';
import type { PbiColumn } from '@/lib/powerBiModel';

interface Props {
  data: Record<string, unknown>[];
  filters: FilterContext;
  numCols: PbiColumn[];
  catCols: PbiColumn[];
  dateCol: PbiColumn | null;
}

interface Insight {
  type: 'anomaly' | 'underperform' | 'action' | 'metric';
  text: string;
  icon: typeof AlertTriangle;
  confidence?: number;
  severity?: 'high' | 'medium' | 'low';
}

export default function PowerBIAIInsights({ data, filters, numCols, catCols, dateCol }: Props) {
  const insights = useMemo((): Insight[] => {
    const list: Insight[] = [];
    const revCol = numCols.find(c => /revenue|sales|amount/i.test(c.name)) ?? numCols[0];
    const total = revCol ? sumFiltered(data, revCol.name, filters) : data.length;

    if (revCol && dateCol) {
      const growth = momGrowth(data, revCol.name, dateCol.name, filters);
      if (Math.abs(growth) > 15) {
        list.push({
          type: 'anomaly',
          text: `${growth > 0 ? 'Spike' : 'Drop'} in ${revCol.name}: ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% MoM`,
          icon: AlertTriangle,
          confidence: 85,
          severity: Math.abs(growth) > 25 ? 'high' : 'medium',
        });
      }
    }

    if (catCols.length > 0 && revCol) {
      const regionCol = catCols.find(c => /region|country|category/i.test(c.name)) ?? catCols[0];
      const byCat: Record<string, number> = {};
      data.forEach(r => {
        const k = String(r[regionCol.name] ?? '');
        byCat[k] = (byCat[k] || 0) + (Number(r[revCol.name]) || 0);
      });
      const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
      if (sorted.length >= 2) {
        const [, topVal] = sorted[0];
        const [lastName, lastVal] = sorted[sorted.length - 1];
        const pct = topVal ? ((lastVal - topVal) / topVal) * 100 : 0;
        if (pct < -20) {
          list.push({
            type: 'underperform',
            text: `${lastName} underperforming vs top region`,
            icon: TrendingDown,
            confidence: 78,
          });
        }
      }
    }

    if (list.length > 0) {
      list.push({
        type: 'action',
        text: 'Review regional allocation and cost ratio',
        icon: Lightbulb,
        confidence: 72,
      });
    }

    if (total > 0) {
      list.unshift({
        type: 'metric',
        text: `Total ${revCol?.name ?? 'value'}: ${formatExecutive(total)}`,
        icon: Target,
      });
    }

    return list.length ? list : [{ type: 'metric' as const, text: `${data.length} rows analyzed`, icon: Target }];
  }, [data, filters, numCols, catCols, dateCol]);

  return (
    <div className="dlux-insight-panel">
      <h3 className="dlux-insight-title">AI Strategic Insights</h3>
      <div className="space-y-0">
        {insights.map((item, i) => {
          const Icon = item.icon;
          const color = item.severity === 'high' ? 'text-[#FF4D4F]' : item.type === 'underperform' ? 'text-[#FF4D4F]' : item.type === 'action' ? 'text-[#14F195]' : 'text-[#00D4FF]';
          return (
            <div key={i} className="dlux-insight-item">
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#E5E7EB] leading-snug">{item.text}</p>
                {item.confidence != null && (
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">Confidence: {item.confidence}%</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
