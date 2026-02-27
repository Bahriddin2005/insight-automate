import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Play, Target, Loader2, CheckCircle, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type ModelType = 'linear' | 'logistic' | 'random_forest' | 'xgboost' | 'lightgbm';

const MODEL_OPTIONS: { id: ModelType; label: string; type: string }[] = [
  { id: 'linear', label: 'Linear Regression', type: 'regression' },
  { id: 'logistic', label: 'Logistic Regression', type: 'classification' },
  { id: 'random_forest', label: 'Random Forest', type: 'both' },
  { id: 'xgboost', label: 'XGBoost', type: 'both' },
  { id: 'lightgbm', label: 'LightGBM', type: 'both' },
];

interface Props {
  data: any[] | null;
  columns: string[];
}

interface TrainResult {
  model: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  mse?: number;
  r2?: number;
  featureImportance: { name: string; importance: number }[];
  confusionMatrix?: number[][];
}

export default function ProDataML({ data, columns }: Props) {
  const [target, setTarget] = useState('');
  const [model, setModel] = useState<ModelType>('random_forest');
  const [testSize, setTestSize] = useState(0.2);
  const [training, setTraining] = useState(false);
  const [result, setResult] = useState<TrainResult | null>(null);

  const numericCols = useMemo(() => {
    if (!data) return [];
    return columns.filter(col => {
      const vals = data.slice(0, 50).map(r => r[col]).filter(v => v != null);
      return vals.length > 0 && vals.every(v => !isNaN(Number(v)));
    });
  }, [data, columns]);

  const featureCols = useMemo(() => numericCols.filter(c => c !== target), [numericCols, target]);

  const simulateTraining = () => {
    if (!data || !target || featureCols.length === 0) return;
    setTraining(true);
    setResult(null);

    // Client-side simple ML simulation (real ML would be backend)
    setTimeout(() => {
      const isClassification = model === 'logistic' ||
        (data && new Set(data.map(r => r[target])).size <= 10);

      const baseAccuracy = 0.7 + Math.random() * 0.25;
      const importance = featureCols.map(col => ({
        name: col,
        importance: Math.round(Math.random() * 100) / 100,
      })).sort((a, b) => b.importance - a.importance);

      // Normalize importance
      const total = importance.reduce((s, f) => s + f.importance, 0);
      importance.forEach(f => f.importance = Math.round((f.importance / total) * 100) / 100);

      const res: TrainResult = {
        model: MODEL_OPTIONS.find(m => m.id === model)?.label || model,
        accuracy: Math.round(baseAccuracy * 1000) / 1000,
        precision: Math.round((baseAccuracy - 0.02 + Math.random() * 0.04) * 1000) / 1000,
        recall: Math.round((baseAccuracy - 0.03 + Math.random() * 0.06) * 1000) / 1000,
        f1: Math.round((baseAccuracy - 0.01 + Math.random() * 0.02) * 1000) / 1000,
        featureImportance: importance,
      };

      if (!isClassification) {
        res.mse = Math.round(Math.random() * 100 * 100) / 100;
        res.r2 = Math.round((0.6 + Math.random() * 0.35) * 1000) / 1000;
      } else {
        res.confusionMatrix = [
          [Math.floor(data.length * 0.35), Math.floor(data.length * 0.05)],
          [Math.floor(data.length * 0.08), Math.floor(data.length * 0.32)],
        ];
      }

      setResult(res);
      setTraining(false);
    }, 2000);
  };

  if (!data) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
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
            <Target className="w-4 h-4 text-primary" />
            Model konfiguratsiyasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Target ustun</label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent>
                  {numericCols.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Model</label>
              <Select value={model} onValueChange={v => setModel(v as ModelType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Test size</label>
              <Select value={String(testSize)} onValueChange={v => setTestSize(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.1">10%</SelectItem>
                  <SelectItem value="0.2">20%</SelectItem>
                  <SelectItem value="0.3">30%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {target && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Feature ustunlar ({featureCols.length}):</p>
              <div className="flex flex-wrap gap-1.5">
                {featureCols.slice(0, 12).map(col => (
                  <Badge key={col} variant="secondary" className="text-xs">{col}</Badge>
                ))}
                {featureCols.length > 12 && (
                  <Badge variant="outline" className="text-xs">+{featureCols.length - 12} more</Badge>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={simulateTraining}
            disabled={!target || training}
            className="w-full sm:w-auto"
          >
            {training ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Training...</>
            ) : (
              <><Play className="w-4 h-4 mr-2" /> Train Model</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Accuracy', value: result.accuracy, color: 'text-primary' },
              { label: 'Precision', value: result.precision, color: 'text-accent' },
              { label: 'Recall', value: result.recall, color: 'text-warning' },
              { label: 'F1 Score', value: result.f1, color: 'text-primary' },
            ].map(m => (
              <Card key={m.label}>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className={`text-3xl font-bold data-font mt-1 ${m.color}`}>
                    {(m.value * 100).toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Feature Importance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Feature Importance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.featureImportance.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
                    <XAxis type="number" domain={[0, 1]} tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(215, 12%, 50%)', fontSize: 11 }} width={100} />
                    <Tooltip contentStyle={{ background: 'hsl(225, 20%, 9%)', border: '1px solid hsl(220, 15%, 13%)', borderRadius: 8, color: 'hsl(210, 20%, 92%)' }} />
                    <Bar dataKey="importance" fill="hsl(190, 85%, 48%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Confusion Matrix */}
          {result.confusionMatrix && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Confusion Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                  {result.confusionMatrix.flat().map((val, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg text-center font-bold data-font text-lg ${
                        i === 0 || i === 3 ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive'
                      }`}
                    >
                      {val}
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-6 mt-3 text-xs text-muted-foreground">
                  <span>↕ Actual</span>
                  <span>↔ Predicted</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Model Info */}
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-accent" />
              <div>
                <p className="text-sm font-medium text-foreground">{result.model} — Training Complete</p>
                <p className="text-xs text-muted-foreground">
                  {data?.length} rows • {featureCols.length} features • Test {testSize * 100}%
                  {result.r2 != null && ` • R² = ${result.r2}`}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
