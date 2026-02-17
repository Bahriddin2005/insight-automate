import { useMemo } from 'react';
import type { FilterContext } from '@/lib/powerBiCalculations';

interface Props {
  data: Record<string, unknown>[];
  rowField: string;
  valueField: string;
  filters: FilterContext;
}

export default function PowerBIMatrix({ data, rowField, valueField }: Props) {
  const matrixData = useMemo(() => {
    const agg: Record<string, number> = {};
    data.forEach(row => {
      const key = String(row[rowField] ?? '');
      const val = Number(row[valueField]) || 0;
      agg[key] = (agg[key] || 0) + val;
    });
    return Object.entries(agg)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, value]) => ({ name, value }));
  }, [data, rowField, valueField]);

  const total = matrixData.reduce((a, r) => a + r.value, 0);

  return (
    <div className="powerbi-matrix p-4">
      <h3 className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-1">Profit by Category</h3>
      <p className="text-[10px] text-[#9ca3af] mb-3">BY {rowField.toUpperCase()} — {valueField}</p>
      <div className="overflow-x-auto rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 font-semibold text-[#374151]">{rowField}</th>
              <th className="text-right py-2 px-3 font-semibold text-[#374151]">{valueField}</th>
              <th className="text-right py-2 px-3 font-semibold text-[#374151]">%</th>
            </tr>
          </thead>
          <tbody>
            {matrixData.map((row, i) => (
              <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-[#374151]">{row.name || '(blank)'}</td>
                <td className="py-2 px-3 text-right tabular-nums font-medium text-[#111827]">{row.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td className="py-2 px-3 text-right tabular-nums text-[#6b7280] text-xs">{total ? ((row.value / total) * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 font-semibold bg-gray-50">
              <td className="py-2 px-3 text-[#111827]">Total</td>
              <td className="py-2 px-3 text-right tabular-nums text-[#111827]">{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              <td className="py-2 px-3 text-right tabular-nums text-[#111827]">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
