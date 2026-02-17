import html2canvas from 'html2canvas';

export async function exportDashboardAsPNG(elementId: string, fileName: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const canvas = await html2canvas(el, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    logging: false,
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
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const imgData = canvas.toDataURL('image/png');

  // Create a simple PDF using a printable window
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const w = canvas.width / 2;
  const h = canvas.height / 2;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head><title>${fileName} Dashboard</title>
    <style>
      @page { size: ${w}px ${h}px; margin: 0; }
      body { margin: 0; padding: 0; }
      img { width: 100%; height: auto; display: block; }
    </style>
    </head>
    <body><img src="${imgData}" /></body>
    </html>
  `);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}
