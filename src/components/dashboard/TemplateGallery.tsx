import { motion } from 'framer-motion';
import { Sparkles, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18nContext';
import { TEMPLATES, suggestTemplate, type TemplateId } from '@/lib/dashboardTemplates';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

interface TemplateGalleryProps {
  analysis: DatasetAnalysis;
  onSelect: (templateId: TemplateId) => void;
  onPowerBIMode?: () => void;
}

export default function TemplateGallery({ analysis, onSelect, onPowerBIMode }: TemplateGalleryProps) {
  const { t, lang } = useI18n();
  const suggested = suggestTemplate(analysis);

  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric').length;
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical').length;
  const dateCols = analysis.columnInfo.filter(c => c.type === 'datetime').length;

  return (
    <div className="min-h-screen bg-[#e8e9eb] p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-[#374151]">
            {t('templates.title')}
          </h1>
          <p className="text-[#6b7280] text-sm max-w-lg mx-auto">{t('templates.subtitle')}</p>
          <div className="flex items-center justify-center gap-3 mt-3 text-xs text-[#6b7280]">
            <span className="bg-white border border-gray-200 px-2 py-1 rounded shadow-sm">{numCols} numeric</span>
            <span className="bg-white border border-gray-200 px-2 py-1 rounded shadow-sm">{catCols} categorical</span>
            <span className="bg-white border border-gray-200 px-2 py-1 rounded shadow-sm">{dateCols} datetime</span>
            <span className="bg-white border border-gray-200 px-2 py-1 rounded shadow-sm">{analysis.rows} rows</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((tmpl, i) => {
            const isSuggested = tmpl.id === suggested;
            return (
              <motion.div
                key={tmpl.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`exec-card p-5 cursor-pointer group hover:shadow-md transition-all duration-300 relative ${
                  isSuggested ? 'ring-2 ring-[#4472C4]' : ''
                }`}
                onClick={() => onSelect(tmpl.id)}
              >
                {isSuggested && (
                  <div className="absolute -top-2 -right-2 bg-[#4472C4] text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {t('templates.recommended')}
                  </div>
                )}
                <div className="text-3xl mb-3">{tmpl.icon}</div>
                <h3 className="text-sm font-semibold text-[#111827] mb-1 group-hover:text-[#4472C4] transition-colors">
                  {lang === 'uz' ? tmpl.nameUz : tmpl.name}
                </h3>
                <p className="text-xs text-[#6b7280] leading-relaxed mb-3">
                  {lang === 'uz' ? tmpl.descriptionUz : tmpl.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {tmpl.slots.filter(s => s.type !== 'kpi').slice(0, 4).map(s => (
                    <span key={s.id} className="text-[10px] bg-gray-100 text-[#374151] px-1.5 py-0.5 rounded">
                      {s.label}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-wrap justify-center gap-3 mt-6">
          <Button variant="outline" size="sm" onClick={() => onSelect('explorer')} className="text-xs text-[#6b7280] border-gray-200">
            {t('templates.skipToExplorer')}
          </Button>
          {onPowerBIMode && (
            <Button variant="default" size="sm" onClick={onPowerBIMode} className="text-xs bg-[#ffaa00] hover:bg-[#e69800] text-[#252526]">
              <LayoutGrid className="w-3 h-3 mr-1.5" />
              Power BI Mode
            </Button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
