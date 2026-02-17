import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18nContext';
import { toast } from '@/hooks/use-toast';
import { detectIntelligentKPIs } from '@/lib/intelligentKPI';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

interface Props {
  analysis: DatasetAnalysis;
  filteredData: Record<string, unknown>[];
  fileName: string;
}

export default function ExecutiveReportGenerator({ analysis, filteredData, fileName }: Props) {
  const { lang } = useI18n();
  const [loading, setLoading] = useState(false);

  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      const kpis = detectIntelligentKPIs(analysis);
      const kpiSummary = kpis.map(k => `• ${k.label}: ${k.value} (${k.changeType || 'neutral'})`).join('\n');

      const colSummary = analysis.columnInfo.map(c => {
        let detail = `${c.name} (${c.type})`;
        if (c.stats) detail += ` — mean: ${c.stats.mean.toFixed(2)}, min: ${c.stats.min}, max: ${c.stats.max}`;
        if (c.topValues) detail += ` — top: ${c.topValues.slice(0, 3).map(v => v.value).join(', ')}`;
        return detail;
      }).join('\n');

      const prompt = `Generate a comprehensive executive report for stakeholder sharing. Include these sections:

1. EXECUTIVE SUMMARY (2-3 sentences)
2. KEY PERFORMANCE INDICATORS
3. DATA QUALITY ASSESSMENT
4. RISK SIGNALS & ALERTS
5. GROWTH OPPORTUNITIES
6. STRATEGIC RECOMMENDATIONS
7. NEXT STEPS

Dataset: ${fileName}
Rows: ${analysis.rows}, Columns: ${analysis.columns}
Quality Score: ${analysis.qualityScore}/100
Date Range: ${analysis.dateRange?.min || 'N/A'} to ${analysis.dateRange?.max || 'N/A'}

Detected KPIs:
${kpiSummary || 'No KPIs detected'}

Column Details:
${colSummary}

Format with clear headers using === for main sections. Be specific with numbers.`;

      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          datasetContext: colSummary,
          language: lang,
        },
      });

      if (error) throw error;

      // Read streaming response
      let reportText = '';
      if (data instanceof ReadableStream) {
        const reader = data.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ') || line.trim() === '') continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) reportText += content;
            } catch { /* partial */ }
          }
        }
      } else if (typeof data === 'string') {
        reportText = data;
      } else if (data?.choices) {
        reportText = data.choices[0]?.message?.content || '';
      }

      if (!reportText.trim()) throw new Error('Empty report');

      // Generate PDF via print window
      const now = new Date().toLocaleDateString();
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({ title: 'Please allow popups', variant: 'destructive' });
        return;
      }

      const sections = reportText.split(/\n/).map(line => {
        if (line.startsWith('===') || line.startsWith('---')) return '<hr style="margin:16px 0;border-color:#e5e7eb"/>';
        if (line.match(/^\d+\.\s+[A-Z]/)) return `<h2 style="color:#1e40af;margin:20px 0 8px;font-size:16px">${line}</h2>`;
        if (line.startsWith('•') || line.startsWith('-')) return `<li style="margin:4px 0;color:#374151">${line.replace(/^[•\-]\s*/, '')}</li>`;
        if (line.trim() === '') return '<br/>';
        return `<p style="margin:4px 0;color:#374151;line-height:1.6">${line}</p>`;
      }).join('\n');

      printWindow.document.write(`<!DOCTYPE html><html><head>
        <title>Executive Report — ${fileName}</title>
        <style>
          @page { size: A4; margin: 2cm; }
          body { font-family: 'Segoe UI', system-ui, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px; color: #1f2937; }
          .header { border-bottom: 3px solid #1e40af; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { color: #1e40af; font-size: 24px; margin: 0; }
          .meta { color: #6b7280; font-size: 12px; margin-top: 8px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 16px 0; }
          .kpi-card { background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; text-align: center; }
          .kpi-card .value { font-size: 20px; font-weight: 700; color: #1e40af; }
          .kpi-card .label { font-size: 11px; color: #6b7280; margin-top: 4px; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
        </style>
      </head><body>
        <div class="header">
          <h1>📊 Executive Report</h1>
          <div class="meta">${fileName} · Generated ${now} · ${analysis.rows.toLocaleString()} rows · Quality: ${analysis.qualityScore}/100</div>
        </div>
        <div class="kpi-grid">${kpis.slice(0, 6).map(k => `<div class="kpi-card"><div class="value">${k.value}</div><div class="label">${k.label} ${k.changeType === 'positive' ? '↑' : k.changeType === 'negative' ? '↓' : '→'}</div></div>`).join('')}</div>
        ${sections}
        <div class="footer">Generated by Data Analytics Platform · ${now}</div>
      </body></html>`);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();

      toast({ title: '✓ Executive report generated', duration: 3000 });
    } catch (e) {
      console.error('Report error:', e);
      toast({ title: 'Report generation failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [analysis, filteredData, fileName, lang]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Executive Report
            </h2>
            <p className="text-[10px] text-muted-foreground">AI-generated stakeholder-ready PDF</p>
          </div>
        </div>
        <Button onClick={generateReport} disabled={loading} size="sm" className="text-xs gap-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {loading ? 'Generating...' : 'Generate Report'}
        </Button>
      </div>
    </motion.div>
  );
}
