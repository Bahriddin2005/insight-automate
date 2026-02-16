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
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('preview.title')}</h3>
        <span className="text-xs text-muted-foreground data-font">{t('preview.showing', { count: Math.min(data.length, 100) })}</span>
      </div>
      <div className="glass-card overflow-hidden max-h-64 overflow-y-auto scrollbar-thin">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-secondary/90 backdrop-blur-sm z-10">
            <tr>
              {visibleCols.map(col => (
                <th key={col} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">{col.length > 16 ? col.slice(0, 16) + '…' : col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} className="border-t border-border/20 hover:bg-secondary/20 transition-colors">
                {visibleCols.map(col => (
                  <td key={col} className="px-3 py-1.5 text-foreground/70 data-font whitespace-nowrap max-w-[150px] truncate">
                    {String(row[col] ?? '').slice(0, 40)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {columns.length > 8 && (
          <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border/20 text-center">
            {t('preview.moreColumns', { count: columns.length - 8 })}
          </div>
        )}
      </div>
    </div>
  );
}
