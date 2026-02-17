import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Code2, Database, BarChart3, Copy, Check, Download } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18nContext';
import { generatePythonCode, generateRCode, generateSQLQueries, generatePowerBIGuide } from '@/lib/codeGenerators';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-r';
import 'prismjs/components/prism-sql';
import 'prismjs/themes/prism-tomorrow.css';

interface CodeViewProps {
  analysis: DatasetAnalysis;
  fileName: string;
}

type SQLDialect = 'ansi' | 'postgresql' | 'mysql' | 'sqlserver';

export default function CodeView({ analysis, fileName }: CodeViewProps) {
  const { t } = useI18n();
  const [copiedTab, setCopiedTab] = useState('');
  const [sqlDialect, setSqlDialect] = useState<SQLDialect>('ansi');

  const pythonCode = useMemo(() => generatePythonCode(analysis, fileName), [analysis, fileName]);
  const rCode = useMemo(() => generateRCode(analysis, fileName), [analysis, fileName]);
  const sqlCode = useMemo(() => generateSQLQueries(analysis, fileName, sqlDialect), [analysis, fileName, sqlDialect]);
  const pbiGuide = useMemo(() => generatePowerBIGuide(analysis, fileName), [analysis, fileName]);

  const copyToClipboard = (text: string, tab: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(''), 2000);
  };

  const downloadFile = (content: string, name: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-4 sm:p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Code2 className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {t('code.title')}
        </h2>
      </div>

      <Tabs defaultValue="python" className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-4">
          <TabsTrigger value="python" className="text-xs sm:text-sm gap-1">
            <Code2 className="w-3 h-3" /> Python
          </TabsTrigger>
          <TabsTrigger value="r" className="text-xs sm:text-sm gap-1">
            <Code2 className="w-3 h-3" /> R
          </TabsTrigger>
          <TabsTrigger value="sql" className="text-xs sm:text-sm gap-1">
            <Database className="w-3 h-3" /> SQL
          </TabsTrigger>
          <TabsTrigger value="powerbi" className="text-xs sm:text-sm gap-1">
            <BarChart3 className="w-3 h-3" /> Power BI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="python">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => copyToClipboard(pythonCode, 'python')}>
              {copiedTab === 'python' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedTab === 'python' ? t('save.copied') : t('code.copy')}
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => downloadFile(pythonCode, `analysis_${fileName.replace(/\.\w+$/, '')}.py`, 'text/x-python')}>
              <Download className="w-3 h-3" /> .py
            </Button>
          </div>
          <CodeBlock code={pythonCode} language="python" />
        </TabsContent>

        <TabsContent value="r">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => copyToClipboard(rCode, 'r')}>
              {copiedTab === 'r' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedTab === 'r' ? t('save.copied') : t('code.copy')}
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => downloadFile(rCode, `analysis_${fileName.replace(/\.\w+$/, '')}.R`, 'text/x-rsrc')}>
              <Download className="w-3 h-3" /> .R
            </Button>
          </div>
          <CodeBlock code={rCode} language="r" />
        </TabsContent>

        <TabsContent value="sql" className="space-y-4">
          {analysis.sqlSelectQueries && analysis.sqlSelectQueries.length > 0 && (
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                <Database className="w-3 h-3" /> SELECT Queries from uploaded SQL file
              </h4>
              <div className="space-y-3">
                {analysis.sqlSelectQueries.map((sq, i) => (
                  <div key={i} className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">
                      {sq.table ? `FROM ${sq.table}` : ''} — columns: {sq.columns.join(', ')}
                    </p>
                    <pre className="text-xs text-foreground overflow-x-auto whitespace-pre-wrap font-mono">{sq.query}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <select value={sqlDialect} onChange={(e) => setSqlDialect(e.target.value as SQLDialect)} className="bg-secondary text-secondary-foreground text-xs rounded-lg px-3 py-1.5 border border-border focus:ring-1 focus:ring-primary outline-none">
              <option value="ansi">ANSI SQL</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlserver">SQL Server</option>
            </select>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => copyToClipboard(sqlCode, 'sql')}>
              {copiedTab === 'sql' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedTab === 'sql' ? t('save.copied') : t('code.copy')}
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => downloadFile(sqlCode, `queries_${fileName.replace(/\.\w+$/, '')}.sql`, 'text/sql')}>
              <Download className="w-3 h-3" /> .sql
            </Button>
          </div>
          <CodeBlock code={sqlCode} language="sql" />
        </TabsContent>

        <TabsContent value="powerbi">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => copyToClipboard(pbiGuide, 'pbi')}>
              {copiedTab === 'pbi' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedTab === 'pbi' ? t('save.copied') : t('code.copy')}
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => downloadFile(pbiGuide, `powerbi_guide_${fileName.replace(/\.\w+$/, '')}.txt`, 'text/plain')}>
              <Download className="w-3 h-3" /> .txt
            </Button>
          </div>
          <CodeBlock code={pbiGuide} language="javascript" />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  return (
    <div className="relative">
      <pre className="rounded-xl border border-border overflow-x-auto max-h-[500px] overflow-y-auto !bg-secondary/50 !m-0 p-4">
        <code
          ref={codeRef}
          className={`language-${language} !text-xs sm:!text-sm !leading-relaxed font-mono whitespace-pre`}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}
