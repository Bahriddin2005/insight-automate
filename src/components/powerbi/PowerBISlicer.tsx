import { useMemo } from 'react';
import { Check } from 'lucide-react';
import type { PbiColumn } from '@/lib/powerBiModel';
import type { FilterContext } from '@/lib/powerBiCalculations';

interface Props {
  column: PbiColumn | undefined;
  filters: FilterContext;
  onFilterChange: (col: string, values: unknown[]) => void;
  data: Record<string, unknown>[];
}

export default function PowerBISlicer({ column, filters, onFilterChange, data }: Props) {
  const options = useMemo(() => {
    if (!column) return [];
    const counts: Record<string, number> = {};
    data.forEach(row => {
      const v = row[column.name];
      const k = String(v ?? '');
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([value, count]) => ({ value, count }));
  }, [column, data]);

  if (!column || !options.length) return null;

  const selected = (filters.slicers[column.name] ?? []) as string[];
  const isAll = selected.length === 0;

  const toggle = (val: string) => {
    if (isAll) {
      onFilterChange(column.name, [val]);
    } else if (selected.includes(val)) {
      const next = selected.filter(x => x !== val);
      onFilterChange(column.name, next.length ? next : []);
    } else {
      onFilterChange(column.name, [...selected, val]);
    }
  };

  const clearAll = () => onFilterChange(column.name, []);

  return (
    <div className="powerbi-slicer">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">{column.name}</h3>
        {!isAll && (
          <button onClick={clearAll} className="text-[10px] text-[#4472C4] hover:underline font-medium">Clear</button>
        )}
      </div>
      <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
        {options.map(({ value, count }) => {
          const isSelected = isAll || selected.includes(value);
          return (
            <button
              key={value}
              onClick={() => toggle(value)}
              className={`powerbi-slicer-item flex items-center gap-2 w-full px-2 py-1.5 rounded text-left text-xs transition-colors ${isSelected ? 'powerbi-slicer-item-selected' : 'hover:bg-gray-50 text-[#374151]'}`}
            >
              {isSelected ? <Check className="w-3 h-3 text-[#4472C4] shrink-0" /> : <span className="w-3 shrink-0" />}
              <span className="truncate flex-1">{value || '(blank)'}</span>
              <span className="text-[#9ca3af] tabular-nums text-[10px]">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
