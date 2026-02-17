import html2canvas from 'html2canvas';
import type { DatasetAnalysis } from './dataProcessor';

export async function exportDashboardAsPNG(elementId: string, fileName: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const canvas = await html2canvas(el, {
    backgroundColor: '#0d1117',
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
  });
  const link = document.createElement('a');
  link.download = `${fileName.replace(/\.\w+$/, '')}_dashboard.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportDashboardAsPDF(elementId: string, fileName: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const canvas = await html2canvas(el, {
    backgroundColor: '#0d1117',
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const imgData = canvas.toDataURL('image/png');
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head><title>${fileName} — Dashboard</title>
    <style>
      @page { size: A4 landscape; margin: 1cm; }
      body { margin: 0; padding: 24px; background: #0d1117; color: #e6edf3; font-family: system-ui, sans-serif; }
      img { max-width: 100%; height: auto; display: block; border-radius: 8px; }
    </style>
    </head>
    <body><img src="${imgData}" alt="Dashboard" /></body>
    </html>
  `);
  printWindow.document.close();
  printWindow.onload = () => printWindow!.print();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Generate and download a professional HTML report with KPIs, statistics, and design */
export function exportDashboardReport(analysis: DatasetAnalysis, fileName: string) {
  const base = escapeHtml(fileName.replace(/\.\w+$/, ''));
  const now = new Date().toLocaleString();
  const numCols = analysis.columnInfo.filter(c => c.type === 'numeric' && c.stats);
  const catCols = analysis.columnInfo.filter(c => c.type === 'categorical' && c.topValues?.length);
  const qScore = Math.min(100, Math.max(0, analysis.qualityScore));

  const statsHtml = numCols.map(col => {
    const s = col.stats!;
    const range = s.max - s.min || 1;
    const meanPct = ((s.mean - s.min) / range * 100).toFixed(0);
    return `
    <tr>
      <td class="col-name">${escapeHtml(col.name)}</td>
      <td class="stat">${s.min.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
      <td class="stat">${s.max.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
      <td class="stat">${s.mean.toFixed(2)}</td>
      <td class="stat">${s.median.toFixed(2)}</td>
      <td class="stat">${s.outliers}</td>
      <td class="bar-cell"><div class="mini-bar"><div class="mini-bar-fill" style="width:${meanPct}%"></div></div></td>
    </tr>`;
  }).join('');

  const kpiCards = [
    { label: 'Jami qatorlar', value: analysis.rows.toLocaleString() },
    { label: 'Ustunlar', value: analysis.columns.toString() },
    { label: "Yo'qolgan %", value: `${analysis.missingPercent}%` },
    { label: 'Dublikatlar', value: analysis.duplicatesRemoved.toString() },
    { label: 'Sifat', value: `${analysis.qualityScore}/100` },
    ...(analysis.dateRange ? [{ label: 'Sana oralig\'i', value: `${analysis.dateRange.min} — ${analysis.dateRange.max}` }] : []),
  ];

  const html = `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <title>${base} — Analytics Report</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; margin: 0; padding: 40px; background: linear-gradient(135deg, #0d1117 0%, #161b22 100%); color: #e6edf3; min-height: 100vh; }
    .container { max-width: 900px; margin: 0 auto; }
    .header { border-bottom: 3px solid #238636; padding-bottom: 24px; margin-bottom: 32px; }
    .header h1 { font-size: 28px; margin: 0; background: linear-gradient(90deg, #58a6ff, #238636); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .meta { color: #8b949e; font-size: 13px; margin-top: 8px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin: 24px 0; }
    .kpi-card { background: rgba(35,134,54,0.15); border: 1px solid rgba(35,134,54,0.4); border-radius: 12px; padding: 16px; text-align: center; }
    .kpi-card .value { font-size: 24px; font-weight: 700; color: #58a6ff; font-variant-numeric: tabular-nums; }
    .kpi-card .label { font-size: 11px; color: #8b949e; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .section { margin: 32px 0; }
    .section h2 { font-size: 18px; color: #58a6ff; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; background: rgba(22,27,34,0.6); border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #30363d; }
    th { background: rgba(35,134,54,0.2); color: #58a6ff; font-size: 11px; text-transform: uppercase; }
    .col-name { font-weight: 600; }
    .stat { font-variant-numeric: tabular-nums; font-family: 'JetBrains Mono', monospace; }
    .bar-cell { width: 80px; }
    .mini-bar { height: 6px; background: #30363d; border-radius: 3px; overflow: hidden; }
    .mini-bar-fill { height: 100%; background: linear-gradient(90deg, #238636, #58a6ff); border-radius: 3px; }
    .quality-bar { height: 8px; background: #30363d; border-radius: 4px; overflow: hidden; margin-top: 8px; }
    .quality-bar-fill { height: 100%; background: linear-gradient(90deg, ${qScore < 50 ? '#f85149' : qScore < 80 ? '#d29922' : '#238636'}, #58a6ff); border-radius: 4px; width: ${qScore}%; }
    .cat-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .cat-tag { background: rgba(88,166,255,0.2); padding: 4px 10px; border-radius: 6px; font-size: 12px; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #30363d; font-size: 12px; color: #8b949e; text-align: center; }
    @media print { body { background: #fff; color: #222; padding: 20px; } .kpi-card { border-color: #ddd; } .container { max-width: 100%; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Analytics Report</h1>
      <div class="meta">${base} · ${now} · ${analysis.rows.toLocaleString()} qator</div>
      <div class="quality-bar"><div class="quality-bar-fill"></div></div>
      <div class="meta" style="margin-top:4px">Sifat skori: ${analysis.qualityScore}/100</div>
    </div>
    <div class="kpi-grid">
      ${kpiCards.map(k => `<div class="kpi-card"><div class="value">${k.value}</div><div class="label">${k.label}</div></div>`).join('')}
    </div>
    ${statsHtml ? `
    <div class="section">
      <h2>Raqamli ustunlar — aniq statistika</h2>
      <table>
        <thead><tr><th>Ustun</th><th>Min</th><th>Max</th><th>O'rtacha</th><th>Mediana</th><th>Og'ishlar</th><th>Diagrama</th></tr></thead>
        <tbody>${statsHtml}</tbody>
      </table>
    </div>` : ''}
    ${catCols.length > 0 ? `
    <div class="section">
      <h2>Kategoriyalar</h2>
      ${catCols.slice(0, 5).map(c => `
        <div style="margin-bottom: 16px;">
          <strong style="font-size: 13px;">${escapeHtml(c.name)}</strong> (${c.uniqueCount} noyob)
          <div class="cat-list">
            ${c.topValues!.slice(0, 6).map(v => `<span class="cat-tag">${escapeHtml(String(v.value))} × ${v.count}</span>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>` : ''}
    <div class="footer">Intelligence Studio · ${now}</div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${base}_report.html`;
  a.click();
  URL.revokeObjectURL(url);
}
