import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, BarChart3, Users, AlertTriangle,
  Upload, PieChart, TestTube, Shield, DollarSign, Target, Activity
} from 'lucide-react';
import PlatformLayout from '@/components/layout/PlatformLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePie, Pie, Cell, Legend, LineChart, Line, ScatterChart, Scatter
} from 'recharts';

// ─── Types ─────────────────────────────────────
interface PaymentRow {
  student: string;
  sinf: string;
  amount: number;
  method: string;
  status: string;
  date: string;
}

interface SegmentStats {
  name: string;
  count: number;
  total: number;
  avg: number;
  pct: number;
}

interface ChurnRisk {
  student: string;
  sinf: string;
  totalPaid: number;
  txCount: number;
  avgPayment: number;
  lastPayment: string;
  recencyDays: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  preferredMethod: string;
}

// ─── Utils ─────────────────────────────────────
const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#6366f1', '#ec4899'
];

const fmt = (n: number) => {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toFixed(0);
};

const welchTTest = (a: number[], b: number[]) => {
  const meanA = a.reduce((s, v) => s + v, 0) / a.length;
  const meanB = b.reduce((s, v) => s + v, 0) / b.length;
  const varA = a.reduce((s, v) => s + (v - meanA) ** 2, 0) / (a.length - 1);
  const varB = b.reduce((s, v) => s + (v - meanB) ** 2, 0) / (b.length - 1);
  const se = Math.sqrt(varA / a.length + varB / b.length);
  const t = se > 0 ? (meanA - meanB) / se : 0;
  const df = Math.round(
    (varA / a.length + varB / b.length) ** 2 /
    ((varA / a.length) ** 2 / (a.length - 1) + (varB / b.length) ** 2 / (b.length - 1))
  );
  // Approximate p-value using normal distribution for large df
  const p = df > 30 ? 2 * (1 - normalCDF(Math.abs(t))) : null;
  return { meanA, meanB, diff: meanA - meanB, t, df, p, se, nA: a.length, nB: b.length };
};

const normalCDF = (x: number) => {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
};

// ─── Main Component ────────────────────────────
export default function BusinessAnalytics() {
  const [data, setData] = useState<PaymentRow[]>([]);
  const [fileName, setFileName] = useState('');

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => setData(parseRows(result.data as Record<string, string>[]))
      });
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
        setData(parseRows(rows));
      };
      reader.readAsBinaryString(file);
    }
  }, []);

  const parseRows = (rows: Record<string, any>[]): PaymentRow[] => {
    return rows.map(r => {
      const keys = Object.keys(r);
      const studentKey = keys.find(k => /quvchi|student|ism|fio|name/i.test(k)) || keys[1] || '';
      const sinfKey = keys.find(k => /sinf|class|grade/i.test(k)) || '';
      const amountKey = keys.find(k => /summa|amount|sum|narx/i.test(k)) || '';
      const methodKey = keys.find(k => /usul|method|turi|type/i.test(k)) || '';
      const statusKey = keys.find(k => /holat|status/i.test(k)) || '';
      const dateKey = keys.find(k => /sana|date|vaqt|time/i.test(k)) || '';
      return {
        student: String(r[studentKey] || '').trim(),
        sinf: String(r[sinfKey] || '').trim(),
        amount: Number(String(r[amountKey] || '0').replace(/[^\d.-]/g, '')) || 0,
        method: String(r[methodKey] || '').trim(),
        status: String(r[statusKey] || 'APPROVED').trim(),
        date: String(r[dateKey] || '').trim(),
      };
    }).filter(r => r.amount > 0);
  };

  // ─── Computed Analytics ──────────────────────
  const analytics = useMemo(() => {
    if (!data.length) return null;

    const totalRevenue = data.reduce((s, r) => s + r.amount, 0);
    const avgCheck = totalRevenue / data.length;

    // By method
    const byMethod: Record<string, number[]> = {};
    data.forEach(r => {
      if (!byMethod[r.method]) byMethod[r.method] = [];
      byMethod[r.method].push(r.amount);
    });
    const methodStats: SegmentStats[] = Object.entries(byMethod)
      .map(([name, amounts]) => ({
        name,
        count: amounts.length,
        total: amounts.reduce((s, v) => s + v, 0),
        avg: amounts.reduce((s, v) => s + v, 0) / amounts.length,
        pct: (amounts.length / data.length) * 100,
      }))
      .sort((a, b) => b.total - a.total);

    // By sinf
    const bySinf: Record<string, number[]> = {};
    data.forEach(r => {
      if (!bySinf[r.sinf]) bySinf[r.sinf] = [];
      bySinf[r.sinf].push(r.amount);
    });
    const sinfStats: SegmentStats[] = Object.entries(bySinf)
      .map(([name, amounts]) => ({
        name,
        count: amounts.length,
        total: amounts.reduce((s, v) => s + v, 0),
        avg: amounts.reduce((s, v) => s + v, 0) / amounts.length,
        pct: (amounts.length / data.length) * 100,
      }))
      .sort((a, b) => b.total - a.total);

    // A/B Test: find two largest methods
    const sortedMethods = [...methodStats].sort((a, b) => b.count - a.count);
    const groupA = sortedMethods[0];
    const groupB = sortedMethods[1];
    let abTest = null;
    if (groupA && groupB) {
      const amountsA = byMethod[groupA.name];
      const amountsB = byMethod[groupB.name];
      abTest = {
        ...welchTTest(amountsA, amountsB),
        nameA: groupA.name,
        nameB: groupB.name,
      };
    }

    // Churn risk by student
    const byStudent: Record<string, PaymentRow[]> = {};
    data.forEach(r => {
      if (!byStudent[r.student]) byStudent[r.student] = [];
      byStudent[r.student].push(r);
    });

    const now = new Date();
    const churnRisks: ChurnRisk[] = Object.entries(byStudent).map(([student, payments]) => {
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      const avgPayment = totalPaid / payments.length;
      const dates = payments.map(p => new Date(p.date)).filter(d => !isNaN(d.getTime()));
      const lastDate = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : now;
      const recencyDays = Math.round((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      // Method preference
      const methodCounts: Record<string, number> = {};
      payments.forEach(p => { methodCounts[p.method] = (methodCounts[p.method] || 0) + 1; });
      const preferredMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

      // Risk score (0-100): higher = more risky
      let riskScore = 0;
      riskScore += Math.min(recencyDays * 1.5, 40); // recency: max 40
      riskScore += payments.length === 1 ? 25 : payments.length === 2 ? 15 : 0; // frequency: max 25
      riskScore += avgPayment < (totalRevenue / data.length * 0.5) ? 20 : 0; // low payer
      riskScore += payments.some(p => p.amount < avgPayment * 0.5) ? 15 : 0; // partial payments
      riskScore = Math.min(Math.round(riskScore), 100);

      const riskLevel: ChurnRisk['riskLevel'] =
        riskScore >= 70 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 30 ? 'medium' : 'low';

      return {
        student,
        sinf: payments[0]?.sinf || '',
        totalPaid,
        txCount: payments.length,
        avgPayment,
        lastPayment: lastDate.toISOString().split('T')[0],
        recencyDays,
        riskScore,
        riskLevel,
        preferredMethod,
      };
    }).sort((a, b) => b.riskScore - a.riskScore);

    const riskDistribution = [
      { name: 'Critical', value: churnRisks.filter(r => r.riskLevel === 'critical').length, fill: '#ef4444' },
      { name: 'High', value: churnRisks.filter(r => r.riskLevel === 'high').length, fill: '#f97316' },
      { name: 'Medium', value: churnRisks.filter(r => r.riskLevel === 'medium').length, fill: '#eab308' },
      { name: 'Low', value: churnRisks.filter(r => r.riskLevel === 'low').length, fill: '#22c55e' },
    ].filter(r => r.value > 0);

    return { totalRevenue, avgCheck, methodStats, sinfStats, abTest, churnRisks, riskDistribution, txCount: data.length };
  }, [data]);

  return (
    <PlatformLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Business Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revenue Breakdown · A/B Test · Churn Risk Analysis
          </p>
        </motion.div>

        {/* File Upload */}
        {!data.length ? (
          <Card className="p-12 text-center border-dashed border-2">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">To'lov ma'lumotlarini yuklang</h2>
            <p className="text-sm text-muted-foreground mb-4">
              CSV yoki Excel fayl (ustunlar: O'quvchi, Sinf, Summa, Usul, Holat, Sana)
            </p>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <Button asChild>
                <span><Upload className="w-4 h-4 mr-1" /> Faylni tanlang</span>
              </Button>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
            </label>
          </Card>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard
                icon={<DollarSign className="w-5 h-5" />}
                label="Jami kirim"
                value={fmt(analytics!.totalRevenue) + " so'm"}
                sub={`${analytics!.txCount} ta tranzaksiya`}
              />
              <KPICard
                icon={<Target className="w-5 h-5" />}
                label="O'rtacha chek"
                value={fmt(analytics!.avgCheck) + " so'm"}
                sub={`${analytics!.methodStats.length} ta usul`}
              />
              <KPICard
                icon={<Users className="w-5 h-5" />}
                label="Unique o'quvchilar"
                value={String(analytics!.churnRisks.length)}
                sub={`${analytics!.sinfStats.length} ta sinf`}
              />
              <KPICard
                icon={<AlertTriangle className="w-5 h-5" />}
                label="Churn risk (yuqori)"
                value={String(analytics!.churnRisks.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical').length)}
                sub="o'quvchi xavf ostida"
                alert
              />
            </div>

            {/* File badge + re-upload */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{fileName} — {data.length} qator</Badge>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span><Upload className="w-3.5 h-3.5 mr-1" /> Boshqa fayl</span>
                </Button>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
              </label>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="revenue">
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="revenue"><PieChart className="w-4 h-4 mr-1" /> Revenue</TabsTrigger>
                <TabsTrigger value="abtest"><TestTube className="w-4 h-4 mr-1" /> A/B Test</TabsTrigger>
                <TabsTrigger value="churn"><Shield className="w-4 h-4 mr-1" /> Churn Risk</TabsTrigger>
              </TabsList>

              {/* ═══ REVENUE TAB ═══ */}
              <TabsContent value="revenue" className="space-y-4 mt-4">
                <div className="grid lg:grid-cols-2 gap-4">
                  {/* By method */}
                  <Card className="p-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-primary" /> To'lov usullari bo'yicha
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={analytics!.methodStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis type="number" tickFormatter={fmt} />
                        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: number) => fmt(v) + " so'm"} />
                        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                          {analytics!.methodStats.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1.5">
                      {analytics!.methodStats.map((m, i) => (
                        <div key={m.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                            {m.name}
                          </span>
                          <span className="text-muted-foreground">
                            {m.count} tx · Ø {fmt(m.avg)} · {m.pct.toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* By sinf */}
                  <Card className="p-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-primary" /> Sinflar bo'yicha
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={analytics!.sinfStats}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={fmt} />
                        <Tooltip formatter={(v: number) => fmt(v) + " so'm"} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="avg" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary" /> Jami kirim
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }} /> O'rtacha chek
                      </span>
                    </div>
                  </Card>

                  {/* Pie chart */}
                  <Card className="p-4 lg:col-span-2">
                    <h3 className="font-semibold text-sm mb-3">Revenue ulushi (usul bo'yicha)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <RePie>
                        <Pie
                          data={analytics!.methodStats}
                          dataKey="total"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, pct }) => `${name} ${pct.toFixed(0)}%`}
                        >
                          {analytics!.methodStats.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v) + " so'm"} />
                      </RePie>
                    </ResponsiveContainer>
                  </Card>
                </div>
              </TabsContent>

              {/* ═══ A/B TEST TAB ═══ */}
              <TabsContent value="abtest" className="space-y-4 mt-4">
                {analytics!.abTest ? (
                  <ABTestPanel test={analytics!.abTest} />
                ) : (
                  <Card className="p-8 text-center text-muted-foreground">
                    Kamida 2 ta to'lov usuli kerak
                  </Card>
                )}
              </TabsContent>

              {/* ═══ CHURN RISK TAB ═══ */}
              <TabsContent value="churn" className="space-y-4 mt-4">
                <div className="grid lg:grid-cols-3 gap-4">
                  {/* Risk distribution */}
                  <Card className="p-4">
                    <h3 className="font-semibold text-sm mb-3">Risk taqsimoti</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <RePie>
                        <Pie
                          data={analytics!.riskDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {analytics!.riskDistribution.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePie>
                    </ResponsiveContainer>
                  </Card>

                  {/* Risk scatter */}
                  <Card className="p-4 lg:col-span-2">
                    <h3 className="font-semibold text-sm mb-3">Risk Score vs To'lov summasi</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="riskScore" name="Risk" unit="%" />
                        <YAxis dataKey="totalPaid" name="To'lov" tickFormatter={fmt} />
                        <Tooltip formatter={(v: number, name: string) =>
                          name === 'To\'lov' ? fmt(v) + " so'm" : v + '%'
                        } />
                        <Scatter data={analytics!.churnRisks} fill="hsl(var(--primary))">
                          {analytics!.churnRisks.map((r, i) => (
                            <Cell key={i} fill={
                              r.riskLevel === 'critical' ? '#ef4444' :
                              r.riskLevel === 'high' ? '#f97316' :
                              r.riskLevel === 'medium' ? '#eab308' : '#22c55e'
                            } />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Risk table */}
                <Card className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="p-3">O'quvchi</th>
                        <th className="p-3">Sinf</th>
                        <th className="p-3">Jami to'lov</th>
                        <th className="p-3">Tx</th>
                        <th className="p-3">Usul</th>
                        <th className="p-3">Risk</th>
                        <th className="p-3 w-32">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics!.churnRisks.slice(0, 20).map((r, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-3 font-medium text-xs">{r.student}</td>
                          <td className="p-3 text-xs">{r.sinf}</td>
                          <td className="p-3 text-xs">{fmt(r.totalPaid)}</td>
                          <td className="p-3 text-xs">{r.txCount}</td>
                          <td className="p-3"><Badge variant="secondary" className="text-[10px]">{r.preferredMethod}</Badge></td>
                          <td className="p-3">
                            <Badge variant={
                              r.riskLevel === 'critical' ? 'destructive' :
                              r.riskLevel === 'high' ? 'destructive' :
                              r.riskLevel === 'medium' ? 'outline' : 'secondary'
                            } className="text-[10px]">
                              {r.riskLevel}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Progress value={r.riskScore} className="h-1.5 flex-1" />
                              <span className="text-[10px] w-7 text-right">{r.riskScore}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {analytics!.churnRisks.length > 20 && (
                    <p className="p-3 text-xs text-muted-foreground text-center">
                      Top 20 / {analytics!.churnRisks.length} o'quvchi ko'rsatilmoqda
                    </p>
                  )}
                </Card>

                {/* Recommendations */}
                <Card className="p-4 bg-muted/30">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-primary" /> Tavsiyalar
                  </h3>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li>• <strong>Critical/High risk</strong> o'quvchilarga shaxsiy qo'ng'iroq qiling</li>
                    <li>• <strong>1 ta tranzaksiya</strong>li yangi o'quvchilarga onboarding taklif qiling</li>
                    <li>• <strong>Kechikish tendensiyasi</strong>li o'quvchilarga SMS eslatma yuboring</li>
                    <li>• To'liq tahlil uchun <strong>3-6 oylik tarixiy ma'lumot</strong> yuklang</li>
                  </ul>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </PlatformLayout>
  );
}

// ─── Sub-components ────────────────────────────
function KPICard({ icon, label, value, sub, alert }: {
  icon: React.ReactNode; label: string; value: string; sub: string; alert?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`p-4 ${alert ? 'border-destructive/30' : ''}`}>
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <span className={alert ? 'text-destructive' : 'text-primary'}>{icon}</span>
          <span className="text-xs">{label}</span>
        </div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </Card>
    </motion.div>
  );
}

function ABTestPanel({ test }: { test: any }) {
  const significant = test.p !== null && test.p < 0.05;
  const data = [
    { name: test.nameA, avg: Math.round(test.meanA), count: test.nA },
    { name: test.nameB, avg: Math.round(test.meanB), count: test.nB },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TestTube className="w-5 h-5 text-primary" />
          Welch's t-Test: {test.nameA} vs {test.nameB}
        </h3>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Control: {test.nameA}</p>
            <p className="text-2xl font-bold">{fmt(test.meanA)}</p>
            <p className="text-xs text-muted-foreground">n = {test.nA}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Treatment: {test.nameB}</p>
            <p className="text-2xl font-bold">{fmt(test.meanB)}</p>
            <p className="text-xs text-muted-foreground">n = {test.nB}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={fmt} />
            <Tooltip formatter={(v: number) => fmt(v) + " so'm"} />
            <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
              <Cell fill="hsl(var(--primary))" />
              <Cell fill="hsl(var(--chart-2))" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Stats */}
      <Card className="p-4">
        <h4 className="font-semibold text-sm mb-3">Statistik natijalar</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox label="Farq" value={fmt(Math.abs(test.diff)) + " so'm"} sub={test.diff > 0 ? `${test.nameA} yuqori` : `${test.nameB} yuqori`} />
          <StatBox label="t-statistic" value={test.t.toFixed(3)} sub={`df = ${test.df}`} />
          <StatBox label="p-value" value={test.p !== null ? test.p.toFixed(4) : 'N/A'} sub={test.p !== null ? (test.p < 0.05 ? 'Significant!' : 'Not significant') : 'df < 30'} />
          <StatBox label="SE" value={fmt(test.se)} sub="Standard Error" />
        </div>

        <div className={`mt-4 p-3 rounded-lg text-sm ${significant ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
          {significant ? (
            <p className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <strong>Statistik significant farq mavjud</strong> (p &lt; 0.05). {test.diff > 0 ? test.nameA : test.nameB} o'rtacha chek yuqori.
            </p>
          ) : (
            <p className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              <strong>Statistik significant farq topilmadi</strong> (p ≥ 0.05). Usullar o'rtasida sezilarli farq yo'q.
            </p>
          )}
        </div>

        <div className="mt-3 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-1">
          <p>⚠️ <strong>Ogohlantirish:</strong> Bu observational data — randomized experiment emas.</p>
          <p>• Selection bias mavjud bo'lishi mumkin (to'lov usulini o'quvchi/ota-ona tanlaydi)</p>
          <p>• Aniqroq natija uchun randomized A/B test o'tkazing (har guruhda n≥150)</p>
        </div>
      </Card>
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/20">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
