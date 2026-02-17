import { useI18n } from '@/lib/i18nContext';

interface DataPreviewProps {
  data: Record<string, unknown>[];
}

export default function DataPreview({ data }: DataPreviewProps) {
  const { t } = useI18n();
  if (!data.length) return null;

  const columns = Object.keys(data[0]);
  const preview = data.slice(0, 100);
  const visibleCols = columns.slice(0, 8);

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">{t('preview.title')}</h3>
        <span className="text-xs text-[#9CA3AF] tabular-nums">{t('preview.showing', { count: Math.min(data.length, 100) })}</span>
      </div>
      <div className="premium-file-card overflow-hidden max-h-64 overflow-y-auto scrollbar-thin rounded-xl">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#111827]/95 backdrop-blur-sm z-10">
            <tr>
              {visibleCols.map(col => (
                <th key={col} className="px-3 py-2 text-left text-[#9CA3AF] font-medium whitespace-nowrap">{col.length > 16 ? col.slice(0, 16) + '…' : col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} className="border-t border-[rgba(0,212,255,0.06)] hover:bg-[rgba(0,212,255,0.04)] transition-colors">
                {visibleCols.map(col => (
                  <td key={col} className="px-3 py-1.5 text-[#E5E7EB]/80 tabular-nums whitespace-nowrap max-w-[150px] truncate">
                    {String(row[col] ?? '').slice(0, 40)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {columns.length > 8 && (
          <div className="px-3 py-2 text-xs text-[#9CA3AF] border-t border-[rgba(0,212,255,0.06)] text-center">
            {t('preview.moreColumns', { count: columns.length - 8 })}
          </div>
        )}
      </div>
    </div>
  );
}
