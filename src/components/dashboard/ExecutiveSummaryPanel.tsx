import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Loader2, AlertTriangle, TrendingUp, Lightbulb, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { detectIntelligentKPIs } from '@/lib/intelligentKPI';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

interface Props {
  analysis: DatasetAnalysis;
  fileName: string;
}

interface SummarySection {
  type: 'insight' | 'risk' | 'opportunity' | 'recommendation';
  title: string;
  content: string;
}

export default function ExecutiveSummaryPanel({ analysis, fileName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<SummarySection[]>([]);
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const generateSummary = async () => {
    setLoading(true);
    setError('');
    setSections([]);
    setRawText('');

    const kpis = detectIntelligentKPIs(analysis);
    const kpiContext = kpis.map(k => `${k.label}: ${k.value}${k.change ? ` (${k.change})` : ''}`).join('\n');

    const colSummary = analysis.columnInfo.map(c => {
      let desc = `${c.name} (${c.type}, ${c.missingPercent}% missing)`;
      if (c.stats) desc += ` range: ${c.stats.min}-${c.stats.max}, avg: ${c.stats.mean.toFixed(2)}`;
      if (c.topValues?.length) desc += ` top: ${c.topValues.slice(0, 3).map(v => `"${v.value}"(${v.count})`).join(', ')}`;
      return desc;
    }).join('\n');

    const prompt = `Analyze this dataset as a senior strategic analyst. File: ${fileName}
Rows: ${analysis.rows}, Columns: ${analysis.columns}, Quality: ${analysis.qualityScore}/100

COLUMNS:
${colSummary}

AUTO-DETECTED KPIs:
${kpiContext || 'None detected'}

Provide your analysis in this EXACT format (use these headers):

## KEY INSIGHTS
[3-5 specific, data-backed findings]

## RISK SIGNALS
[2-4 risks or concerns identified in the data]

## GROWTH OPPORTUNITIES
[2-4 actionable growth opportunities]

## STRATEGIC RECOMMENDATIONS
[3-5 specific, prioritized action items with expected impact]

Be specific. Use actual numbers from the data. No generic advice.`;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            datasetContext: `File: ${fileName}, ${analysis.rows} rows, ${analysis.columns} columns`,
            language: 'en',
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) { setError('Rate limited. Try again shortly.'); setLoading(false); return; }
        if (response.status === 402) { setError('Credits exhausted. Please add funds.'); setLoading(false); return; }
        throw new Error(`Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setRawText(fullText);
            }
          } catch { /* partial */ }
        }
      }

      // Parse sections
      const parsed = parseSections(fullText);
      setSections(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && sections.length === 0 && !loading && !rawText) {
      generateSummary();
    }
  }, [isOpen]);

  const sectionIcons: Record<string, React.ElementType> = {
    insight: Lightbulb,
    risk: AlertTriangle,
    opportunity: TrendingUp,
    recommendation: Shield,
  };

  const sectionColors: Record<string, string> = {
    insight: 'text-chart-1 bg-chart-1/10',
    risk: 'text-destructive bg-destructive/10',
    opportunity: 'text-success bg-success/10',
    recommendation: 'text-primary bg-primary/10',
  };

  return (
    <>
      {/* Trigger button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-1 bg-primary text-primary-foreground px-2 py-4 rounded-l-xl shadow-lg hover:px-3 transition-all"
        whileHover={{ x: -4 }}
      >
        <Brain className="w-5 h-5" />
        <span className="text-[9px] font-medium writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>
          STRATEGIC SUMMARY
        </span>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              ref={panelRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-background border-l border-border z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Executive Strategic Summary</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={generateSummary} disabled={loading} className="text-xs">
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-3">
                    {error}
                  </div>
                )}

                {loading && !rawText && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Analyzing your data strategically...</p>
                  </div>
                )}

                {/* Streaming text display */}
                {loading && rawText && (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{rawText}</div>
                  </div>
                )}

                {/* Parsed sections */}
                {!loading && sections.map((section, i) => {
                  const Icon = sectionIcons[section.type] || Lightbulb;
                  const colorClass = sectionColors[section.type] || 'text-foreground bg-muted';
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-xl border border-border/50 overflow-hidden"
                    >
                      <div className={`flex items-center gap-2 px-4 py-2.5 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">{section.title}</span>
                      </div>
                      <div className="px-4 py-3">
                        <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{section.content}</div>
                      </div>
                    </motion.div>
                  );
                })}

                {!loading && sections.length === 0 && rawText && (
                  <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{rawText}</div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-border/50 text-center">
                <p className="text-[10px] text-muted-foreground">Powered by Strategic Analytics Engine · AI-generated analysis</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function parseSections(text: string): SummarySection[] {
  const sections: SummarySection[] = [];
  const headerMap: Record<string, SummarySection['type']> = {
    'key insights': 'insight',
    'insights': 'insight',
    'risk signals': 'risk',
    'risks': 'risk',
    'growth opportunities': 'opportunity',
    'opportunities': 'opportunity',
    'strategic recommendations': 'recommendation',
    'recommendations': 'recommendation',
  };

  const lines = text.split('\n');
  let currentType: SummarySection['type'] | null = null;
  let currentTitle = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)/);
    if (headerMatch) {
      if (currentType && currentContent.length > 0) {
        sections.push({ type: currentType, title: currentTitle, content: currentContent.join('\n').trim() });
      }
      const header = headerMatch[1].toLowerCase().replace(/[^a-z\s]/g, '').trim();
      currentType = headerMap[header] || 'insight';
      currentTitle = headerMatch[1].trim();
      currentContent = [];
    } else if (currentType) {
      currentContent.push(line);
    }
  }

  if (currentType && currentContent.length > 0) {
    sections.push({ type: currentType, title: currentTitle, content: currentContent.join('\n').trim() });
  }

  return sections;
}
