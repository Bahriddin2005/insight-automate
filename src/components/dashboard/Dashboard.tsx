import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KPICards from './KPICards';
import AutoCharts from './AutoCharts';
import DataTable from './DataTable';
import InsightsPanel from './InsightsPanel';
import { generateInsights } from '@/lib/dataProcessor';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

interface DashboardProps {
  analysis: DatasetAnalysis;
  fileName: string;
  onReset: () => void;
}

export default function Dashboard({ analysis, fileName, onReset }: DashboardProps) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical' && c.topValues && c.topValues.length <= 20);

  const filteredData = useMemo(() => {
    return analysis.cleanedData.filter(row =>
      Object.entries(filters).every(([col, val]) => !val || String(row[col]) === val)
    );
  }, [analysis.cleanedData, filters]);

  const insights = useMemo(() => generateInsights(analysis), [analysis]);

  return (
    <div className="min-h-screen bg-mesh">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onReset} className="shrink-0 h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">{fileName}</h1>
            <p className="text-xs text-muted-foreground">
              {analysis.rows.toLocaleString()} rows · {analysis.columns} columns · Quality: {analysis.qualityScore}/100
            </p>
          </div>
          {catCols.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs"
            >
              <Filter className="w-3 h-3 mr-1.5" /> Filters
            </Button>
          )}
        </div>

        {/* Filters */}
        {showFilters && catCols.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="border-t border-border/30 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap gap-3">
              {catCols.slice(0, 5).map(col => (
                <select
                  key={col.name}
                  value={filters[col.name] || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, [col.name]: e.target.value }))}
                  className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">{col.name} (All)</option>
                  {col.topValues!.map(v => (
                    <option key={v.value} value={v.value}>{v.value} ({v.count})</option>
                  ))}
                </select>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({})}
                className="text-xs text-muted-foreground"
              >
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </motion.header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <KPICards analysis={analysis} />
        <InsightsPanel insights={insights} />
        <AutoCharts analysis={analysis} filteredData={filteredData} />
        <DataTable data={filteredData} columns={analysis.columnInfo} />
      </main>
    </div>
  );
}
