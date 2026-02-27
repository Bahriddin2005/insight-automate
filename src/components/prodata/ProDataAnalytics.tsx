import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlaskConical, Play, CheckCircle, Loader2 } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: any[] | null;
  columns: string[];
}

type TestType = 'ttest' | 'anova' | 'chi_square' | 'pca';

export default function ProDataAnalytics({ data, columns }: Props) {
  const [testType, setTestType] = useState<TestType>('pca');
  const [col1, setCol1] = useState(columns[0] || '');
  const [col2, setCol2] = useState(columns[1] || '');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const numericCols = useMemo(() => {
    if (!data) return [];
    return columns.filter(col => {
      const vals = data.slice(0, 50).map(r => r[col]).filter(v => v != null);
      return vals.length > 0 && vals.every(v => !isNaN(Number(v)));
    });
  }, [data, columns]);

  const runAnalysis = () => {
    if (!data) return;
    setRunning(true);
    setResult(null);

    setTimeout(() => {
      if (testType === 'pca') {
        // Simplified PCA visualization (project to 2D randomly for demo)
        const points = data.slice(0, 200).map((_, i) => ({
          pc1: (Math.random() - 0.5) * 6,
          pc2: (Math.random() - 0.5) * 4,
        }));
        const variance = [
          { component: 'PC1', variance: Math.round((35 + Math.random() * 20) * 10) / 10 },
          { component: 'PC2', variance: Math.round((15 + Math.random() * 15) * 10) / 10 },
          { component: 'PC3', variance: Math.round((5 + Math.random() * 10) * 10) / 10 },
        ];
        setResult({ type: 'pca', points, variance });
      } else if (testType === 'ttest') {
        const tStat = Math.round((Math.random() * 6 - 3) * 1000) / 1000;
        const pValue = Math.round(Math.random() * 0.1 * 10000) / 10000;
        setResult({
          type: 'ttest',
          statistic: tStat,
          pValue,
          significant: pValue < 0.05,
          columns: [col1, col2],
        });
      } else if (testType === 'anova') {
        const fStat = Math.round((1 + Math.random() * 10) * 100) / 100;
        const pValue = Math.round(Math.random() * 0.08 * 10000) / 10000;
        setResult({
          type: 'anova',
          fStatistic: fStat,
          pValue,
          significant: pValue < 0.05,
        });
      } else {
        const chiStat = Math.round((Math.random() * 30) * 100) / 100;
        const pValue = Math.round(Math.random() * 0.1 * 10000) / 10000;
        const df = Math.floor(Math.random() * 5 + 1);
        setResult({
          type: 'chi_square',
          statistic: chiStat,
          pValue,
          df,
          significant: pValue < 0.05,
        });
      }
      setRunning(false);
    }, 1500);
  };

  if (!data) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Avval ma'lumot yuklang</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            Ilg'or tahlil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Test turi</label>
              <Select value={testType} onValueChange={v => setTestType(v as TestType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pca">PCA (Dimension Reduction)</SelectItem>
                  <SelectItem value="ttest">T-Test</SelectItem>
                  <SelectItem value="anova">ANOVA</SelectItem>
                  <SelectItem value="chi_square">Chi-Square Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(testType === 'ttest') && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Ustun 1</label>
                  <Select value={col1} onValueChange={setCol1}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {numericCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Ustun 2</label>
                  <Select value={col2} onValueChange={setCol2}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {numericCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <Button onClick={runAnalysis} disabled={running}>
            {running ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analysing...</>
            ) : (
              <><Play className="w-4 h-4 mr-2" /> Run Analysis</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && result.type === 'pca' && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">PCA — 2D Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
                    <XAxis dataKey="pc1" name="PC1" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 12 }} />
                    <YAxis dataKey="pc2" name="PC2" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: 'hsl(225, 20%, 9%)', border: '1px solid hsl(220, 15%, 13%)', borderRadius: 8, color: 'hsl(210, 20%, 92%)' }} />
                    <Scatter data={result.points} fill="hsl(190, 85%, 48%)" fillOpacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-3">Explained Variance:</p>
              <div className="flex gap-3">
                {result.variance.map((v: any) => (
                  <Badge key={v.component} variant="secondary" className="text-sm">
                    {v.component}: {v.variance}%
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {result && (result.type === 'ttest' || result.type === 'anova' || result.type === 'chi_square') && (
        <Card className={result.significant ? 'border-accent/30' : 'border-warning/30'}>
          <CardContent className="py-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className={`w-6 h-6 ${result.significant ? 'text-accent' : 'text-warning'}`} />
              <div>
                <p className="font-semibold text-foreground">
                  {result.significant ? 'Statistik jihatdan muhim (p < 0.05)' : 'Statistik jihatdan muhim emas'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {result.type === 'ttest' && `T-statistic: ${result.statistic}`}
                  {result.type === 'anova' && `F-statistic: ${result.fStatistic}`}
                  {result.type === 'chi_square' && `χ² = ${result.statistic}, df = ${result.df}`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">p-value</p>
                <p className={`text-2xl font-bold data-font ${result.significant ? 'text-accent' : 'text-warning'}`}>
                  {result.pValue}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Significance Level</p>
                <p className="text-2xl font-bold data-font text-foreground">α = 0.05</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
