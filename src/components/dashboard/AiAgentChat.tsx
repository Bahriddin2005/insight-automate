import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Loader2, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18nContext';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#8b5cf6', '#ec4899', '#14b8a6'];

interface ChartBlock {
  type: 'bar' | 'line' | 'pie';
  title: string;
  data: { name: string; value: number }[];
}

function parseChartBlocks(content: string): { text: string; charts: ChartBlock[] } {
  const charts: ChartBlock[] = [];
  const cleaned = content.replace(/```chart\s*\n([\s\S]*?)```/g, (_, json) => {
    try {
      const parsed = JSON.parse(json.trim());
      if (parsed.data && Array.isArray(parsed.data)) {
        charts.push({ type: parsed.type || 'bar', title: parsed.title || '', data: parsed.data });
      }
    } catch { /* ignore parse errors */ }
    return '';
  });
  return { text: cleaned.trim(), charts };
}

function InlineChart({ chart }: { chart: ChartBlock }) {
  return (
    <div className="mt-2 rounded-lg border border-border/50 bg-muted/30 p-2">
      {chart.title && <p className="text-[10px] font-medium text-muted-foreground mb-1">{chart.title}</p>}
      <div className="h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === 'bar' ? (
            <BarChart data={chart.data} margin={{ top: 2, right: 2, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          ) : chart.type === 'line' ? (
            <LineChart data={chart.data} margin={{ top: 2, right: 2, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {chart.data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

interface AiAgentChatProps {
  analysis: DatasetAnalysis;
  fileName: string;
}

export default function AiAgentChat({ analysis, fileName }: AiAgentChatProps) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: t('agent.welcome') },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const buildContext = () => {
    const cols = analysis.columnInfo.map(c => {
      let desc = `${c.name} (${c.type}): ${c.uniqueCount} unique, ${c.missingPercent.toFixed(1)}% missing`;
      if (c.stats) desc += `, range: ${c.stats.min}–${c.stats.max}, mean: ${c.stats.mean.toFixed(2)}, median: ${c.stats.median.toFixed(2)}`;
      if (c.topValues?.length) desc += `, top values: ${c.topValues.slice(0, 5).map(v => `${v.value}(${v.count})`).join(', ')}`;
      return desc;
    }).join('\n');

    return `File: ${fileName}
Rows: ${analysis.rows}, Columns: ${analysis.columns}
Quality Score: ${analysis.qualityScore}/100
Missing: ${analysis.missingPercent}%, Duplicates Removed: ${analysis.duplicatesRemoved}
${analysis.dateRange ? `Date Range: ${analysis.dateRange.min} to ${analysis.dateRange.max}` : 'No date columns'}

Column Details:
${cols}

Sample data (first 5 rows):
${JSON.stringify(analysis.cleanedData.slice(0, 5), null, 0)}

IMPORTANT: When the user asks for visualization or chart, you MUST include chart data in this format:
\`\`\`chart
{"type":"bar","title":"Chart title","data":[{"name":"Label1","value":10},{"name":"Label2","value":20}]}
\`\`\`
Supported chart types: bar, line, pie. Always provide real computed data from the dataset.`;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: input.trim() };
    const allMsgs = [...messages.filter(m => m !== messages[0]), userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    let assistantContent = '';
    const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`;

    try {
      const resp = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMsgs.map(m => ({ role: m.role, content: m.content })),
          datasetContext: buildContext(),
          language: lang,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: assistantContent } : m
              ));
            }
          } catch { /* partial json */ }
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Unknown error'}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full gradient-primary flex items-center justify-center glow-primary shadow-lg hover:opacity-90 transition-opacity"
      >
        {open ? <X className="w-6 h-6 text-primary-foreground" /> : <MessageSquare className="w-6 h-6 text-primary-foreground" />}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-96 max-h-[70vh] flex flex-col glass-card overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="gradient-primary px-4 py-3 flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary-foreground" />
              <h3 className="text-sm font-semibold text-primary-foreground">{t('agent.title')}</h3>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin min-h-[300px] max-h-[50vh]">
              {messages.map((msg, i) => {
                const { text, charts } = msg.role === 'assistant' ? parseChartBlocks(msg.content) : { text: msg.content, charts: [] };
                return (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                      {charts.map((chart, ci) => (
                        <InlineChart key={ci} chart={chart} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {loading && messages[messages.length - 1]?.content === '' && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" /> {t('agent.thinking')}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border/50 p-3">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('agent.placeholder')}
                  className="flex-1 bg-secondary border-border text-sm h-9"
                  disabled={loading}
                />
                <Button type="submit" size="icon" disabled={loading || !input.trim()} className="h-9 w-9 gradient-primary shrink-0">
                  <Send className="w-4 h-4 text-primary-foreground" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
