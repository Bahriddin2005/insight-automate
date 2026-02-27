import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Rocket, Upload, Sparkles } from 'lucide-react';

interface Props {
  data: any[] | null;
  columns: string[];
}

export default function ProDataPredict({ data, columns }: Props) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [prediction, setPrediction] = useState<number | null>(null);
  const [probability, setProbability] = useState<number | null>(null);

  const numericCols = columns.filter(col => {
    if (!data) return false;
    const vals = data.slice(0, 50).map(r => r[col]).filter(v => v != null);
    return vals.length > 0 && vals.every(v => !isNaN(Number(v)));
  });

  const handlePredict = () => {
    // Simulated prediction
    const val = Object.values(inputs).reduce((s, v) => s + (Number(v) || 0), 0);
    const result = Math.round((val * 0.7 + Math.random() * 30) * 100) / 100;
    setPrediction(result);
    setProbability(Math.round((0.6 + Math.random() * 0.35) * 100));
  };

  if (!data) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <Rocket className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Avval ma'lumot yuklang va model o'rgating</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Real-time Prediction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Qiymatlarni kiriting va bashorat oling:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {numericCols.slice(0, 6).map(col => (
              <div key={col}>
                <label className="text-xs text-muted-foreground mb-1 block">{col}</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={inputs[col] || ''}
                  onChange={e => setInputs(p => ({ ...p, [col]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <Button onClick={handlePredict} disabled={Object.keys(inputs).length === 0}>
            <Rocket className="w-4 h-4 mr-2" />
            Predict
          </Button>
        </CardContent>
      </Card>

      {prediction !== null && (
        <Card className="border-primary/30">
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Bashorat natijasi</p>
            <p className="text-5xl font-bold text-primary data-font">{prediction}</p>
            {probability !== null && (
              <Badge variant="secondary" className="text-sm">
                Ishonch: {probability}%
              </Badge>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
