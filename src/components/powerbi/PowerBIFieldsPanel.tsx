import { ChevronRight, ChevronDown, Hash, Calendar, Type, Filter } from 'lucide-react';
import { useState } from 'react';
import type { PowerBiDataModel, PbiTable, PbiMeasure } from '@/lib/powerBiModel';
import type { FilterContext } from '@/lib/powerBiCalculations';

interface Props {
  model: PowerBiDataModel;
  measures: PbiMeasure[];
  filters: FilterContext;
  onFilterChange: (f: FilterContext) => void;
  slicerColumns?: string[];
  onSlicerColumnsChange?: (cols: string[]) => void;
}

export default function PowerBIFieldsPanel({ model, measures, slicerColumns = [], onSlicerColumnsChange }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const factTable = model?.tables?.find(t => t.role === 'fact');
  const catCols = factTable?.columns?.filter(c => c.type === 'categorical') ?? [];

  const toggleSlicer = (colName: string) => {
    if (!onSlicerColumnsChange) return;
    const next = slicerColumns.includes(colName)
      ? slicerColumns.filter(x => x !== colName)
      : [...slicerColumns, colName];
    onSlicerColumnsChange(next);
  };

  return (
    <div className="p-4">
      <h2 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-4 px-1">Fields</h2>
      <div className="space-y-0.5">
        {(model?.tables ?? []).map(t => (
          <div key={t.name}>
            <button onClick={() => toggle(t.name)} className="flex items-center gap-2 w-full px-2 py-2 rounded text-left hover:bg-[rgba(0,212,255,0.08)] text-sm font-medium text-[#E5E7EB] transition-colors">
              {(expanded[t.name] ?? true) ? <ChevronDown className="w-3.5 h-3.5 text-[#00D4FF] shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />}
              <span>{t.name}</span>
              {t.rowCount > 0 && <span className="text-[10px] text-[#9CA3AF] ml-auto tabular-nums">{t.rowCount}</span>}
            </button>
            {(expanded[t.name] ?? true) && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-[rgba(0,212,255,0.2)] pl-2">
                {t.columns.map(c => (
                  <div key={c.name} className="flex items-center gap-2 px-2 py-1 rounded text-xs text-[#9CA3AF] hover:bg-[rgba(0,212,255,0.06)] group">
                    {c.type === 'numeric' ? <Hash className="w-3 h-3 text-[#00D4FF] shrink-0" /> : c.type === 'datetime' ? <Calendar className="w-3 h-3 text-[#14F195] shrink-0" /> : <Type className="w-3 h-3 text-[#9CA3AF] shrink-0" />}
                    <span className="truncate flex-1">{c.name}</span>
                    {c.role === 'measure' && <span className="text-[10px] text-[#ED7D31] font-semibold">∑</span>}
                    {c.type === 'categorical' && onSlicerColumnsChange && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSlicer(c.name); }}
                        title={slicerColumns.includes(c.name) ? 'Remove from Slicers' : 'Add to Slicers'}
                        className={`p-0.5 rounded ${slicerColumns.includes(c.name) ? 'bg-[#00D4FF]/20 text-[#00D4FF]' : 'text-[#6B7280] hover:text-[#00D4FF]'}`}
                      >
                        <Filter className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {catCols.length > 0 && onSlicerColumnsChange && (
          <div className="mt-4 pt-4 border-t border-[rgba(0,212,255,0.15)]">
            <h3 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-[#00D4FF]" /> Slicers
            </h3>
            <p className="text-[10px] text-[#9CA3AF] px-1 mb-2">Click filter icon to add</p>
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-[rgba(0,212,255,0.15)]">
          <h3 className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-1 mb-2">Measures</h3>
          {measures.length > 0 ? (
            <div className="space-y-0.5">
              {measures.map(m => (
                <div key={m.name} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-[#9CA3AF] hover:bg-[rgba(0,212,255,0.06)]">
                  <span className="text-[#C8A24D] font-bold">∑</span>
                  <span className="truncate">{m.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-[#9CA3AF] px-1">No measures</p>
          )}
        </div>
      </div>
    </div>
  );
}
