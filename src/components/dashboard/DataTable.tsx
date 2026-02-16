import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toCSV, toExcelBlob } from '@/lib/dataProcessor';
import type { ColumnInfo } from '@/lib/dataProcessor';
import { useI18n } from '@/lib/i18nContext';

interface DataTableProps {
  data: Record<string, unknown>[];
  columns: ColumnInfo[];
}

const PAGE_SIZE = 25;

export default function DataTable({ data, columns }: DataTableProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return data;
    return data.filter(row => columns.some(c => String(row[c.name] ?? '').toLowerCase().includes(q)));
  }, [data, columns, search]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortCol] ?? '';
      const vb = b[sortCol] ?? '';
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortAsc]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (col: string) => { if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(true); } };

  const exportCSV = () => { const blob = new Blob([toCSV(data)], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'cleaned_data.csv'; a.click(); URL.revokeObjectURL(url); };
  const exportExcel = () => { const blob = toExcelBlob(data); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'cleaned_data.xlsx'; a.click(); URL.revokeObjectURL(url); };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="glass-card overflow-hidden">
      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b border-border/50">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder={t('table.search')} className="w-full bg-secondary text-secondary-foreground pl-9 pr-3 py-2 rounded-lg text-sm border border-border focus:ring-1 focus:ring-primary outline-none" />
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs"><Download className="w-3 h-3 mr-1.5" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="text-xs"><Download className="w-3 h-3 mr-1.5" /> Excel</Button>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/30">
              {columns.filter(c => c.type !== 'id').slice(0, 12).map(col => (
                <th key={col.name} onClick={() => handleSort(col.name)} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    {col.name}
                    {sortCol === col.name && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr key={i} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                {columns.filter(c => c.type !== 'id').slice(0, 12).map(col => (
                  <td key={col.name} className="px-4 py-2.5 whitespace-nowrap text-foreground/80 data-font text-xs">{String(row[col.name] ?? '').slice(0, 60)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 flex items-center justify-between border-t border-border/50">
        <span className="text-xs text-muted-foreground">{sorted.length.toLocaleString()} {t('table.rows')} · {t('table.page')} {page + 1}{t('table.of')}{totalPages || 1}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
    </motion.div>
  );
}
