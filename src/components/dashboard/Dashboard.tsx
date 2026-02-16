import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Filter, Sparkles, Loader2, Save, Link2, Check, Globe, Lock, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import KPICards from './KPICards';
import AutoCharts from './AutoCharts';
import DataTable from './DataTable';
import InsightsPanel from './InsightsPanel';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import ChartCustomizer, { type CustomChartConfig } from './ChartCustomizer';
import CorrelationHeatmap from './CorrelationHeatmap';
import AiAgentChat from './AiAgentChat';
import CodeView from './CodeView';
import CleaningReport from './CleaningReport';
import SchemaViewer from './SchemaViewer';
import { useI18n } from '@/lib/i18nContext';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/integrations/supabase/client';
import { exportDashboardAsPNG, exportDashboardAsPDF } from '@/lib/exportDashboard';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

interface DashboardProps {
  analysis: DatasetAnalysis;
  fileName: string;
  onReset: () => void;
}

export default function Dashboard({ analysis, fileName, onReset }: DashboardProps) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [catFilters, setCatFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [customCharts, setCustomCharts] = useState<CustomChartConfig[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saveName, setSaveName] = useState(fileName);
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Date range filter state
  const dateCol = analysis.columnInfo.find(c => c.type === 'datetime');
  const [dateFrom, setDateFrom] = useState(analysis.dateRange?.min || '');
  const [dateTo, setDateTo] = useState(analysis.dateRange?.max || '');

  // Numeric range filter state
  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric' && c.stats);
  const [numFilter, setNumFilter] = useState<{ col: string; min: number; max: number } | null>(null);

  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical' && c.topValues && c.topValues.length <= 20);

  const filteredData = useMemo(() => {
    return analysis.cleanedData.filter(row => {
      // Categorical filters
      const catPass = Object.entries(catFilters).every(([col, val]) => !val || String(row[col]) === val);
      if (!catPass) return false;

      // Date range filter
      if (dateCol && (dateFrom || dateTo)) {
        const d = new Date(String(row[dateCol.name]));
        if (!isNaN(d.getTime())) {
          if (dateFrom && d < new Date(dateFrom)) return false;
          if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
        }
      }

      // Numeric range filter
      if (numFilter) {
        const v = Number(row[numFilter.col]);
        if (!isNaN(v) && (v < numFilter.min || v > numFilter.max)) return false;
      }

      return true;
    });
  }, [analysis.cleanedData, catFilters, dateCol, dateFrom, dateTo, numFilter]);

  const clearAllFilters = () => {
    setCatFilters({});
    setDateFrom(analysis.dateRange?.min || '');
    setDateTo(analysis.dateRange?.max || '');
    setNumFilter(null);
  };

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

      await supabase
        .from('upload_sessions')
        .update({ ai_summary: data.summary } as Record<string, unknown>)
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

  const numericColNames = numCols.map(c => c.name);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('dashboard_configs').insert([{
        user_id: user.id,
        name: saveName || fileName,
        is_public: isPublic,
        config: JSON.parse(JSON.stringify({ customCharts, catFilters })),
        file_name: fileName,
        analysis_data: JSON.parse(JSON.stringify(analysis)),
      }]).select('share_token').single();

      if (error) throw error;
      const url = `${window.location.origin}/shared/${data.share_token}`;
      setShareUrl(url);
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="full-dashboard-export" className="min-h-screen bg-mesh">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={onReset} className="shrink-0 h-8 w-8 sm:h-9 sm:w-9"><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate">{fileName}</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{analysis.rows.toLocaleString()} {t('table.rows')} · {analysis.columns} {t('kpi.totalColumns').toLowerCase()} · {t('header.quality')}: {analysis.qualityScore}/100</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => exportDashboardAsPNG('full-dashboard-export', fileName)} className="text-[10px] sm:text-xs h-7 sm:h-9 px-2">
              <Image className="w-3 h-3" /> <span className="hidden sm:inline ml-1">PNG</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportDashboardAsPDF('full-dashboard-export', fileName)} className="text-[10px] sm:text-xs h-7 sm:h-9 px-2">
              <FileText className="w-3 h-3" /> <span className="hidden sm:inline ml-1">PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="text-[10px] sm:text-xs h-7 sm:h-9 px-2 sm:px-3">
              <Filter className="w-3 h-3 mr-1" /> <span className="hidden sm:inline">{t('filters.button')}</span>
            </Button>
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>

        {/* Save & Share Panel */}
        {user && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-2 sm:pb-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder={t('save.name')} className="h-7 sm:h-8 text-[10px] sm:text-xs w-28 sm:w-40 bg-secondary border-border" />
            <Button variant="ghost" size="sm" onClick={() => setIsPublic(!isPublic)} className="text-xs gap-1">
              {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {isPublic ? t('save.public') : t('save.private')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="text-xs">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
              {t('save.dashboard')}
            </Button>
            {shareUrl && (
              <Button variant="ghost" size="sm" onClick={copyLink} className="text-xs gap-1">
                {copied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                {copied ? t('save.copied') : t('save.copyLink')}
              </Button>
            )}
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="border-t border-border/30 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-3">
              {/* Date range filter */}
              {dateCol && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium w-20">{t('filters.dateRange')}:</span>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border focus:ring-1 focus:ring-primary outline-none" />
                  <span className="text-xs text-muted-foreground">→</span>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border focus:ring-1 focus:ring-primary outline-none" />
                </div>
              )}

              {/* Numeric range filter */}
              {numCols.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium w-20">{t('filters.numericRange')}:</span>
                  <select
                    value={numFilter?.col || ''}
                    onChange={(e) => {
                      const col = numCols.find(c => c.name === e.target.value);
                      if (col?.stats) setNumFilter({ col: col.name, min: col.stats.min, max: col.stats.max });
                      else setNumFilter(null);
                    }}
                    className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="">—</option>
                    {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  {numFilter && (
                    <>
                      <input type="number" value={numFilter.min} onChange={(e) => setNumFilter({ ...numFilter, min: Number(e.target.value) })}
                        className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border focus:ring-1 focus:ring-primary outline-none w-24 data-font" />
                      <span className="text-xs text-muted-foreground">→</span>
                      <input type="number" value={numFilter.max} onChange={(e) => setNumFilter({ ...numFilter, max: Number(e.target.value) })}
                        className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border focus:ring-1 focus:ring-primary outline-none w-24 data-font" />
                    </>
                  )}
                </div>
              )}

              {/* Categorical filters */}
              {catCols.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {catCols.slice(0, 5).map(col => (
                    <select key={col.name} value={catFilters[col.name] || ''} onChange={(e) => setCatFilters(prev => ({ ...prev, [col.name]: e.target.value }))}
                      className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border focus:ring-1 focus:ring-primary outline-none">
                      <option value="">{col.name} ({t('filters.all')})</option>
                      {col.topValues!.map(v => <option key={v.value} value={v.value}>{v.value} ({v.count})</option>)}
                    </select>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-muted-foreground">{t('filters.clear')}</Button>
                <span className="text-xs text-muted-foreground data-font">{filteredData.length.toLocaleString()} / {analysis.rows.toLocaleString()} {t('table.rows')}</span>
              </div>
            </div>
          </motion.div>
        )}
      </motion.header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <KPICards analysis={analysis} />
        <CleaningReport analysis={analysis} fileName={fileName} />
        <SchemaViewer analysis={analysis} />
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

        {/* Correlation Heatmap */}
        {numericColNames.length >= 2 && (
          <CorrelationHeatmap data={filteredData} numericColumns={numericColNames} />
        )}

        <ChartCustomizer columns={analysis.columnInfo} data={filteredData} customCharts={customCharts} onAddChart={c => setCustomCharts(prev => [...prev, c])} onRemoveChart={id => setCustomCharts(prev => prev.filter(c => c.id !== id))} />
        
        <CodeView analysis={analysis} fileName={fileName} />
        
        <DataTable data={filteredData} columns={analysis.columnInfo} />
      </main>

      <AiAgentChat analysis={analysis} fileName={fileName} />
    </div>
  );
}
