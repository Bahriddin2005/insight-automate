import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Filter, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KPICards from './KPICards';
import AutoCharts from './AutoCharts';
import DataTable from './DataTable';
import InsightsPanel from './InsightsPanel';
import LanguageToggle from './LanguageToggle';
import ChartCustomizer, { type CustomChartConfig } from './ChartCustomizer';
import { useI18n } from '@/lib/i18nContext';
import { supabase } from '@/integrations/supabase/client';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

interface DashboardProps {
  analysis: DatasetAnalysis;
  fileName: string;
  onReset: () => void;
}

export default function Dashboard({ analysis, fileName, onReset }: DashboardProps) {
  const { t, lang } = useI18n();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [customCharts, setCustomCharts] = useState<CustomChartConfig[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical' && c.topValues && c.topValues.length <= 20);

  const filteredData = useMemo(() => {
    return analysis.cleanedData.filter(row =>
      Object.entries(filters).every(([col, val]) => !val || String(row[col]) === val)
    );
  }, [analysis.cleanedData, filters]);

  const generateAiSummary = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-summary', {
        body: {
          columnInfo: analysis.columnInfo,
          rows: analysis.rows,
          columns: analysis.columns,
          qualityScore: analysis.qualityScore,
          missingPercent: analysis.missingPercent,
          duplicatesRemoved: analysis.duplicatesRemoved,
          dateRange: analysis.dateRange,
          language: lang,
        },
      });
      if (error) throw error;
      setAiSummary(data.summary);

      // Update session with AI summary
      await supabase
        .from('upload_sessions')
        .update({ ai_summary: data.summary })
        .eq('file_name', fileName)
        .order('created_at', { ascending: false })
        .limit(1);
    } catch (e) {
      console.error('AI summary error:', e);
      setAiSummary(t('ai.error'));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onReset} className="shrink-0 h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">{fileName}</h1>
            <p className="text-xs text-muted-foreground">{analysis.rows.toLocaleString()} {t('table.rows')} · {analysis.columns} {t('kpi.totalColumns').toLowerCase()} · {t('header.quality')}: {analysis.qualityScore}/100</p>
          </div>
          <div className="flex items-center gap-2">
            {catCols.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="text-xs">
                <Filter className="w-3 h-3 mr-1.5" /> {t('filters.button')}
              </Button>
            )}
            <LanguageToggle />
          </div>
        </div>

        {showFilters && catCols.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="border-t border-border/30 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap gap-3">
              {catCols.slice(0, 5).map(col => (
                <select key={col.name} value={filters[col.name] || ''} onChange={(e) => setFilters(prev => ({ ...prev, [col.name]: e.target.value }))} className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border focus:ring-1 focus:ring-primary outline-none">
                  <option value="">{col.name} ({t('filters.all')})</option>
                  {col.topValues!.map(v => <option key={v.value} value={v.value}>{v.value} ({v.count})</option>)}
                </select>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setFilters({})} className="text-xs text-muted-foreground">{t('filters.clear')}</Button>
            </div>
          </motion.div>
        )}
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <KPICards analysis={analysis} />
        <InsightsPanel analysis={analysis} />

        {/* AI Summary */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-warm flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-foreground" />
              </div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('ai.summary')}</h2>
            </div>
            <Button variant="outline" size="sm" onClick={generateAiSummary} disabled={aiLoading} className="text-xs">
              {aiLoading ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> {t('ai.generating')}</> : t('ai.generate')}
            </Button>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{aiSummary || t('ai.noSummary')}</p>
        </motion.div>

        <AutoCharts analysis={analysis} filteredData={filteredData} />
        <ChartCustomizer columns={analysis.columnInfo} data={filteredData} customCharts={customCharts} onAddChart={c => setCustomCharts(prev => [...prev, c])} onRemoveChart={id => setCustomCharts(prev => prev.filter(c => c.id !== id))} />
        <DataTable data={filteredData} columns={analysis.columnInfo} />
      </main>
    </div>
  );
}
