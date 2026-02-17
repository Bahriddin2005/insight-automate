import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Database, Code, FileDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buildPowerBiExportPackage, exportMeasuresTxt } from '@/lib/powerBiExport';
import { exportAsCSV, exportAsJSON, exportAsExcel } from '@/lib/exportData';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import type { PowerBiDataModel, PbiMeasure } from '@/lib/powerBiModel';

interface Props {
  analysis: DatasetAnalysis;
  model: PowerBiDataModel;
  measures: PbiMeasure[];
  fileName: string;
}

export default function PowerBIExport({ analysis, model, measures, fileName }: Props) {
  const [open, setOpen] = useState(false);
  const pkg = buildPowerBiExportPackage(analysis, model, measures, fileName);

  const downloadTxt = (content: string, name: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="powerbi-export-btn h-8 gap-2 text-xs">
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => { window.print(); setOpen(false); }}>
          <FileDown className="w-3.5 h-3.5 mr-2" /> Export PDF (Print)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { exportAsCSV(analysis.cleanedData, fileName.replace(/\.[^.]+$/, '_pbi_ready')); setOpen(false); }}>
          <Database className="w-3.5 h-3.5 mr-2" /> Model-ready CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { exportAsExcel(analysis.cleanedData, fileName.replace(/\.[^.]+$/, '_pbi_ready')); setOpen(false); }}>
          <Database className="w-3.5 h-3.5 mr-2" /> Model-ready Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { downloadTxt(exportMeasuresTxt(measures), fileName.replace(/\.[^.]+$/, '_measures.txt')); setOpen(false); }}>
          <FileText className="w-3.5 h-3.5 mr-2" /> DAX Measures (.txt)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { downloadTxt(pkg.mSteps, fileName.replace(/\.[^.]+$/, '_powerquery.m')); setOpen(false); }}>
          <Code className="w-3.5 h-3.5 mr-2" /> Power Query (M)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { downloadTxt(pkg.dataDictionary, fileName.replace(/\.[^.]+$/, '_data_dictionary.md')); setOpen(false); }}>
          <FileText className="w-3.5 h-3.5 mr-2" /> Data Dictionary (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { downloadTxt(pkg.instructions, fileName.replace(/\.[^.]+$/, '_import_instructions.md')); setOpen(false); }}>
          <FileText className="w-3.5 h-3.5 mr-2" /> Import Instructions
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
