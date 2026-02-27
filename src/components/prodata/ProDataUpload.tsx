import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Check, AlertTriangle, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface Props {
  onDataLoaded: (data: any[], columns: string[], fileName: string) => void;
  currentData: any[] | null;
  fileName: string;
}

export default function ProDataUpload({ onDataLoaded, currentData, fileName }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [colTypes, setColTypes] = useState<Record<string, string>>({});

  const detectColumnTypes = (data: any[], cols: string[]) => {
    const types: Record<string, string> = {};
    cols.forEach(col => {
      const sample = data.slice(0, 50).map(r => r[col]).filter(v => v != null && v !== '');
      if (sample.length === 0) { types[col] = 'empty'; return; }
      const allNum = sample.every(v => !isNaN(Number(v)));
      if (allNum) { types[col] = 'numeric'; return; }
      const datePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/;
      const allDate = sample.every(v => datePattern.test(String(v)));
      if (allDate) { types[col] = 'date'; return; }
      const unique = new Set(sample);
      types[col] = unique.size <= Math.min(20, sample.length * 0.5) ? 'categorical' : 'text';
    });
    return types;
  };

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let data: any[] = [];

      if (ext === 'csv' || ext === 'tsv') {
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
        data = result.data as any[];
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(ws);
      } else if (ext === 'json') {
        const text = await file.text();
        const parsed = JSON.parse(text);
        data = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        toast.error('Faqat CSV, Excel, JSON fayllar qo\'llaniladi');
        setLoading(false);
        return;
      }

      if (data.length === 0) {
        toast.error('Fayl bo\'sh yoki noto\'g\'ri format');
        setLoading(false);
        return;
      }

      const cols = Object.keys(data[0]);
      const types = detectColumnTypes(data, cols);
      setColTypes(types);
      setPreview(data.slice(0, 10));
      onDataLoaded(data, cols, file.name);
      toast.success(`${data.length} qator, ${cols.length} ustun yuklandi`);
    } catch (e) {
      toast.error('Faylni o\'qishda xatolik');
      console.error(e);
    }
    setLoading(false);
  }, [onDataLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const typeColor = (t: string) => {
    switch (t) {
      case 'numeric': return 'bg-primary/10 text-primary';
      case 'date': return 'bg-accent/10 text-accent';
      case 'categorical': return 'bg-warning/10 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <Card
        className={`border-2 border-dashed transition-all cursor-pointer ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('prodata-file')?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
            isDragging ? 'bg-primary/20' : 'bg-secondary'
          }`}>
            {loading ? (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className={`w-7 h-7 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            )}
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {loading ? 'Yuklanmoqda...' : 'Faylni shu yerga tashlang'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">CSV, Excel (.xlsx), JSON • 50MB gacha</p>
          </div>
          <input
            id="prodata-file"
            type="file"
            accept=".csv,.tsv,.xlsx,.xls,.json"
            onChange={handleChange}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Column types */}
      {Object.keys(colTypes).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              Ustun turlari aniqlandi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(colTypes).map(([col, type]) => (
                <Badge key={col} variant="outline" className={`${typeColor(type)} text-xs`}>
                  {col} <span className="ml-1 opacity-60">({type})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview table */}
      {preview && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Ma'lumotlar ko'rinishi (ilk 10 qator)
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {fileName}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {Object.keys(preview[0]).map(col => (
                    <th key={col} className="text-left py-2 px-3 text-muted-foreground font-medium whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                    {Object.values(row).map((val: any, j) => (
                      <td key={j} className="py-2 px-3 whitespace-nowrap text-foreground">
                        {val == null ? <span className="text-muted-foreground/50 italic">null</span> : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
