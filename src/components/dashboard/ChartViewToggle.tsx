import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Box, BarChart3, Clock } from 'lucide-react';
import AutoCharts from './AutoCharts';
import Dashboard3D from './Dashboard3D';
import TimeSlider4D from './TimeSlider4D';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

type ViewMode = '2d' | '3d' | '4d';

interface ChartViewToggleProps {
  analysis: DatasetAnalysis;
  filteredData: Record<string, unknown>[];
}

export default function ChartViewToggle({ analysis, filteredData }: ChartViewToggleProps) {
  const [mode, setMode] = useState<ViewMode>('2d');
  const [timeIndex, setTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Extract date column and unique sorted dates for 4D mode
  const dateCol = analysis.columnInfo.find(c => c.type === 'datetime');
  const uniqueDates = useMemo(() => {
    if (!dateCol) return [];
    const set = new Set<string>();
    filteredData.forEach(row => {
      const d = new Date(String(row[dateCol.name]));
      if (!isNaN(d.getTime())) set.add(d.toISOString().split('T')[0]);
    });
    return Array.from(set).sort();
  }, [dateCol, filteredData]);

  // Build 3D data from first numeric or categorical column
  const data3D = useMemo(() => {
    const catCol = analysis.columnInfo.find(c => c.type === 'categorical' && c.topValues?.length);
    if (catCol?.topValues) {
      return catCol.topValues.slice(0, 12).map(v => ({ label: v.value, value: v.count }));
    }
    const numCol = analysis.columnInfo.find(c => c.type === 'numeric' && c.stats);
    if (numCol) {
      const values = filteredData.slice(0, 12).map((r, i) => ({
        label: String(r[analysis.columnInfo[0]?.name] || `#${i + 1}`).slice(0, 12),
        value: Number(r[numCol.name]) || 0,
      }));
      return values;
    }
    return [];
  }, [analysis, filteredData]);

  // 4D: filter data by current date
  const filteredByTime = useMemo(() => {
    if (mode !== '4d' || !dateCol || uniqueDates.length === 0) return filteredData;
    const targetDate = uniqueDates[timeIndex];
    return filteredData.filter(row => {
      const d = new Date(String(row[dateCol.name]));
      return !isNaN(d.getTime()) && d.toISOString().split('T')[0] === targetDate;
    });
  }, [mode, dateCol, uniqueDates, timeIndex, filteredData]);

  // 4D: build time-aware 3D data
  const data3DForTime = useMemo(() => {
    if (mode !== '4d') return data3D;
    const numCol = analysis.columnInfo.find(c => c.type === 'numeric' && c.stats);
    const catCol = analysis.columnInfo.find(c => c.type === 'categorical' && c.topValues?.length);
    if (catCol) {
      const counts: Record<string, number> = {};
      filteredByTime.forEach(row => {
        const v = String(row[catCol.name]);
        counts[v] = (counts[v] || 0) + 1;
      });
      return Object.entries(counts).slice(0, 12).map(([label, value]) => ({ label, value }));
    }
    if (numCol) {
      return filteredByTime.slice(0, 12).map((r, i) => ({
        label: String(r[analysis.columnInfo[0]?.name] || `#${i + 1}`).slice(0, 12),
        value: Number(r[numCol.name]) || 0,
      }));
    }
    return [];
  }, [mode, data3D, filteredByTime, analysis]);

  // Auto-play timer
  useEffect(() => {
    if (isPlaying && uniqueDates.length > 1) {
      intervalRef.current = setInterval(() => {
        setTimeIndex(prev => {
          if (prev >= uniqueDates.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, uniqueDates.length]);

  const handlePlayToggle = useCallback(() => {
    if (!isPlaying && timeIndex >= uniqueDates.length - 1) setTimeIndex(0);
    setIsPlaying(p => !p);
  }, [isPlaying, timeIndex, uniqueDates.length]);

  return (
    <div className="space-y-3">
      {/* Mode toggle buttons */}
      <div className="flex items-center gap-1.5">
        <Button
          variant={mode === '2d' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setMode('2d')}
        >
          <BarChart3 className="w-3 h-3" /> 2D
        </Button>
        <Button
          variant={mode === '3d' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setMode('3d')}
          disabled={data3D.length === 0}
        >
          <Box className="w-3 h-3" /> 3D
        </Button>
        {dateCol && uniqueDates.length > 1 && (
          <Button
            variant={mode === '4d' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => { setMode('4d'); setTimeIndex(0); }}
          >
            <Clock className="w-3 h-3" /> 4D
          </Button>
        )}
      </div>

      {/* 4D time slider */}
      {mode === '4d' && dateCol && (
        <TimeSlider4D
          dates={uniqueDates}
          currentIndex={timeIndex}
          onIndexChange={setTimeIndex}
          isPlaying={isPlaying}
          onPlayToggle={handlePlayToggle}
        />
      )}

      {/* Render view */}
      {mode === '2d' && <AutoCharts analysis={analysis} filteredData={filteredData} />}
      {mode === '3d' && (
        <div className="h-[450px]">
          <Dashboard3D data={data3D} title="3D Dashboard" onToggle2D={() => setMode('2d')} />
        </div>
      )}
      {mode === '4d' && (
        <div className="h-[450px]">
          <Dashboard3D
            data={data3DForTime}
            title={`4D — ${uniqueDates[timeIndex] || ''}`}
            onToggle2D={() => setMode('2d')}
          />
        </div>
      )}
    </div>
  );
}
