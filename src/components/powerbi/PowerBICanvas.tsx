import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ArrowLeft, LayoutGrid, RotateCcw, Presentation } from 'lucide-react';
import PowerBIFieldsPanel from './PowerBIFieldsPanel';
import PowerBIExport from './PowerBIExport';
import PowerBIReportCanvas from './PowerBIReportCanvas';
import PowerBIVisualSettings from './PowerBIVisualSettings';
import PowerBIExecutiveSummary from './PowerBIExecutiveSummary';
import PowerBIAIInsights from './PowerBIAIInsights';
import { buildPowerBiModel } from '@/lib/powerBiModel';
import { generateDaxMeasures } from '@/lib/daxGenerator';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import type { PowerBiDataModel, PbiMeasure, PbiColumn } from '@/lib/powerBiModel';
import type { FilterContext } from '@/lib/powerBiCalculations';

interface PowerBICanvasProps {
  analysis: DatasetAnalysis;
  fileName: string;
  onBack: () => void;
}

export default function PowerBICanvas({ analysis, fileName, onBack }: PowerBICanvasProps) {
  const [model] = useState<PowerBiDataModel>(() => {
    try {
      return buildPowerBiModel(analysis);
    } catch (e) {
      console.error('Power BI model build failed:', e);
      return {
        tables: [],
        relationships: [],
        measures: [],
        dateIntelligence: { table: 'DimDate', dateColumn: 'Date' },
      };
    }
  });
  const [measures] = useState<PbiMeasure[]>(() => {
    try {
      return generateDaxMeasures(analysis, model);
    } catch {
      return [];
    }
  });
  const [filters, setFilters] = useState<FilterContext>({ slicers: {} });
  const [selectedVisual, setSelectedVisual] = useState<string | null>(null);
  const [visualConfig, setVisualConfig] = useState<Record<string, unknown>>({});
  const [boardMode, setBoardMode] = useState(false);
  const [slicerColumns, setSlicerColumns] = useState<string[]>(() => {
    try {
      const fact = model?.tables?.find(t => t.role === 'fact');
      const first = fact?.columns?.find(c => c.type === 'categorical');
      return first ? [first.name] : [];
    } catch {
      return [];
    }
  });

  const cleanedData = Array.isArray(analysis?.cleanedData) ? analysis.cleanedData : [];
  const filteredData = useMemo(() => {
    if (Object.keys(filters.slicers || {}).every(k => !filters.slicers[k]?.length)) return cleanedData;
    const { filterData } = require('@/lib/powerBiCalculations');
    return filterData(cleanedData, filters);
  }, [cleanedData, filters]);

  const factTable = model?.tables?.find(t => t.role === 'fact') ?? model?.tables?.[0];
  const numCols: PbiColumn[] = factTable?.columns?.filter(c => c.type === 'numeric' && c.role === 'measure') ?? [];
  const catCols: PbiColumn[] = factTable?.columns?.filter(c => c.type === 'categorical') ?? [];
  const dateCol = factTable?.dateColumn ? factTable.columns?.find(c => c.name === factTable.dateColumn) ?? null : null;

  const hasActiveFilters = Object.keys(filters.slicers || {}).some(k => (filters.slicers[k]?.length ?? 0) > 0) ||
    !!filters.dateRange?.min || !!filters.dateRange?.max;
  const resetFilters = () => setFilters({ slicers: {}, dateRange: undefined });

  const dateColName = factTable?.dateColumn ?? factTable?.columns?.find(c => c.type === 'datetime')?.name;
  const dateRange = filters.dateRange;

  return (
    <div className={`h-screen flex flex-col powerbi-canvas ${boardMode ? 'board-mode' : ''}`}>
      <header className="powerbi-header h-12 sm:h-14 flex shrink-0">
        <div className="flex items-center justify-between px-4 sm:px-6 h-full">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[rgba(0,212,255,0.1)]">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="powerbi-logo shrink-0 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <span className="text-[#E5E7EB] font-medium text-sm hidden sm:inline">Executive BI</span>
            <div className="h-4 w-px bg-[rgba(0,212,255,0.2)] mx-1" />
            <span className="text-[#E5E7EB] font-semibold text-sm truncate">Board Intelligence</span>
            <span className="text-[11px] text-[#9CA3AF] ml-1 hidden lg:inline truncate max-w-[140px]">{fileName}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {!boardMode && dateColName && (
              <input
                type="month"
                value={dateRange?.min?.slice(0, 7) ?? ''}
                onChange={e => {
                  const v = e.target.value;
                  const [y, m] = v ? v.split('-').map(Number) : [null, null];
                  const min = v ? `${v}-01` : undefined;
                  const max = y && m ? `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}` : undefined;
                  setFilters(f => ({ ...f, dateRange: min && max && dateColName ? { column: dateColName, min, max } : undefined }));
                }}
                className="h-8 px-2.5 text-xs border border-[rgba(0,212,255,0.2)] rounded bg-[#0B1220] text-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-[#00D4FF]"
              />
            )}
            {!boardMode && hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 gap-1.5 text-xs text-[#9CA3AF] hover:text-[#E5E7EB]">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
            )}
            <Button
              variant={boardMode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBoardMode(b => !b)}
              className={`h-8 gap-1.5 text-xs ${boardMode ? 'bg-[#00D4FF] text-[#0B1220] hover:bg-[#00D4FF]/90' : 'text-[#9CA3AF] hover:text-[#00D4FF]'}`}
            >
              <Presentation className="w-3.5 h-3.5" /> Board Mode
            </Button>
            <PowerBIExport analysis={analysis} model={model} measures={measures} fileName={fileName} />
            <span className="text-[11px] text-[#9CA3AF] tabular-nums hidden sm:inline">{analysis.rows.toLocaleString()} rows</span>
          </div>
        </div>
      </header>
      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal" className="h-full">
          {!boardMode && (
            <>
              <Panel defaultSize={18} minSize={12} maxSize={28} className="powerbi-panel powerbi-panel-left overflow-auto">
                <PowerBIFieldsPanel model={model} measures={measures} filters={filters} onFilterChange={setFilters} slicerColumns={slicerColumns} onSlicerColumnsChange={setSlicerColumns} />
              </Panel>
              <PanelResizeHandle className="powerbi-resize-handle w-1.5" />
            </>
          )}
          <Panel defaultSize={boardMode ? 76 : 58} minSize={40} className="powerbi-report-bg overflow-auto">
            <PowerBIReportCanvas analysis={analysis} model={model} measures={measures} data={filteredData} filters={filters} onFilterChange={setFilters} visualConfig={visualConfig} selectedVisual={selectedVisual} onSelectVisual={setSelectedVisual} slicerColumns={slicerColumns} boardMode={boardMode} />
          </Panel>
          <PanelResizeHandle className="powerbi-resize-handle w-1.5" />
          <Panel defaultSize={24} minSize={16} maxSize={35} className="powerbi-panel powerbi-panel-right overflow-auto">
            <div className="p-4 space-y-4">
              <PowerBIAIInsights data={filteredData} filters={filters} numCols={numCols} catCols={catCols} dateCol={dateCol} />
              <div className="h-px bg-[rgba(0,212,255,0.1)] my-4" />
              <PowerBIExecutiveSummary data={filteredData} filters={filters} numCols={numCols} catCols={catCols} dateCol={dateCol} boardMode={boardMode} />
              <div className="h-px bg-[rgba(0,212,255,0.1)] my-4" />
              <PowerBIVisualSettings model={model} measures={measures} selectedVisual={selectedVisual} config={visualConfig} onConfigChange={setVisualConfig} onSelectVisual={setSelectedVisual} />
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
