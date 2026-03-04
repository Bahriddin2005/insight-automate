import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, BarChart3, Users, AlertTriangle,
  Upload, PieChart, TestTube, Shield, DollarSign, Target, Activity,
  Save, Brain, Loader2, History, Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import PlatformLayout from '@/components/layout/PlatformLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

interface SavedSnapshot {
  snapshot_date: string;
  total_students: number;
  avg_risk: number;
  critical_count: number;
  high_count: number;
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
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [snapshots, setSnapshots] = useState<SavedSnapshot[]>([]);
  const [showMonitor, setShowMonitor] = useState(false);
  const { user } = useAuth();

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setAiRecommendation('');

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

    const byMethod: Record<string, number[]> = {};
    data.forEach(r => {
      if (!byMethod[r.method]) byMethod[r.method] = [];
      byMethod[r.method].push(r.amount);
    });
    const methodStats: SegmentStats[] = Object.entries(byMethod)
      .map(([name, amounts]) => ({
        name, count: amounts.length,
        total: amounts.reduce((s, v) => s + v, 0),
        avg: amounts.reduce((s, v) => s + v, 0) / amounts.length,
        pct: (amounts.length / data.length) * 100,
      }))
      .sort((a, b) => b.total - a.total);

    const bySinf: Record<string, number[]> = {};
    data.forEach(r => {
      if (!bySinf[r.sinf]) bySinf[r.sinf] = [];
      bySinf[r.sinf].push(r.amount);
    });
    const sinfStats: SegmentStats[] = Object.entries(bySinf)
      .map(([name, amounts]) => ({
        name, count: amounts.length,
        total: amounts.reduce((s, v) => s + v, 0),
        avg: amounts.reduce((s, v) => s + v, 0) / amounts.length,
        pct: (amounts.length / data.length) * 100,
      }))
      .sort((a, b) => b.total - a.total);

    const sortedMethods = [...methodStats].sort((a, b) => b.count - a.count);
    const groupA = sortedMethods[0];
    const groupB = sortedMethods[1];
    let abTest = null;
    if (groupA && groupB) {
      abTest = { ...welchTTest(byMethod[groupA.name], byMethod[groupB.name]), nameA: groupA.name, nameB: groupB.name };
    }

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

      const methodCounts: Record<string, number> = {};
      payments.forEach(p => { methodCounts[p.method] = (methodCounts[p.method] || 0) + 1; });
      const preferredMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

      let riskScore = 0;
      riskScore += Math.min(recencyDays * 1.5, 40);
      riskScore += payments.length === 1 ? 25 : payments.length === 2 ? 15 : 0;
      riskScore += avgPayment < (totalRevenue / data.length * 0.5) ? 20 : 0;
      riskScore += payments.some(p => p.amount < avgPayment * 0.5) ? 15 : 0;
      riskScore = Math.min(Math.round(riskScore), 100);

      const riskLevel: ChurnRisk['riskLevel'] =
        riskScore >= 70 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 30 ? 'medium' : 'low';

      return { student, sinf: payments[0]?.sinf || '', totalPaid, txCount: payments.length, avgPayment, lastPayment: lastDate.toISOString().split('T')[0], recencyDays, riskScore, riskLevel, preferredMethod };
    }).sort((a, b) => b.riskScore - a.riskScore);

    const riskDistribution = [
      { name: 'Critical', value: churnRisks.filter(r => r.riskLevel === 'critical').length, fill: '#ef4444' },
      { name: 'High', value: churnRisks.filter(r => r.riskLevel === 'high').length, fill: '#f97316' },
      { name: 'Medium', value: churnRisks.filter(r => r.riskLevel === 'medium').length, fill: '#eab308' },
      { name: 'Low', value: churnRisks.filter(r => r.riskLevel === 'low').length, fill: '#22c55e' },
    ].filter(r => r.value > 0);

    return { totalRevenue, avgCheck, methodStats, sinfStats, abTest, churnRisks, riskDistribution, txCount: data.length };
  }, [data]);

  // ─── Save to DB ──────────────────────────────
  const handleSave = async () => {
    if (!user || !analytics) { toast.error('Avval tizimga kiring'); return; }
    setSaving(true);
    try {
      const rows = analytics.churnRisks.map(r => ({
        user_id: user.id,
        student_name: r.student,
        sinf: r.sinf,
        total_paid: r.totalPaid,
        tx_count: r.txCount,
        avg_payment: r.avgPayment,
        last_payment_date: r.lastPayment,
        recency_days: r.recencyDays,
        risk_score: r.riskScore,
        risk_level: r.riskLevel,
        preferred_method: r.preferredMethod,
        file_name: fileName,
        snapshot_date: new Date().toISOString().split('T')[0],
      }));

      const { error } = await supabase.from('churn_risk_scores' as any).insert(rows as any);
      if (error) throw error;
      toast.success(`${rows.length} ta o'quvchi natijasi saqlandi`);
    } catch (e: any) {
      toast.error(e.message || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  // ─── Load Monitoring Data ────────────────────
  const loadSnapshots = async () => {
    if (!user) return;
    try {
      const { data: scores } = await supabase
        .from('churn_risk_scores' as any)
        .select('snapshot_date, risk_score, risk_level')
        .eq('user_id', user.id)
        .order('snapshot_date', { ascending: true }) as any;

      if (!scores?.length) { setSnapshots([]); return; }

      const byDate: Record<string, any[]> = {};
      scores.forEach((s: any) => {
        if (!byDate[s.snapshot_date]) byDate[s.snapshot_date] = [];
        byDate[s.snapshot_date].push(s);
      });

      const snaps: SavedSnapshot[] = Object.entries(byDate).map(([date, items]) => ({
        snapshot_date: date,
        total_students: items.length,
        avg_risk: Math.round(items.reduce((s: number, i: any) => s + i.risk_score, 0) / items.length),
        critical_count: items.filter((i: any) => i.risk_level === 'critical').length,
        high_count: items.filter((i: any) => i.risk_level === 'high').length,
      }));

      setSnapshots(snaps);
    } catch { /* ignore */ }
  };

  // ─── AI Recommendations (streaming) ──────────
  const getAiRecommendations = async () => {
    if (!analytics) return;
    setAiLoading(true);
    setAiRecommendation('');

    const topStudents = analytics.churnRisks.slice(0, 15);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/churn-recommendations`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ students: topStudents }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Xatolik: ${resp.status}`);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('Stream not available');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAiRecommendation(fullText);
            }
          } catch { /* partial */ }
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'AI xatolik');
    } finally {
      setAiLoading(false);
    }
  };

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
            Revenue Breakdown · A/B Test · Churn Risk · AI Tavsiyalar · Monitoring
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

            {/* Monitoring link */}
            {user && (
              <div className="mt-6">
                <Button variant="outline" size="sm" onClick={() => { setShowMonitor(true); loadSnapshots(); }}>
                  <History className="w-4 h-4 mr-1" /> Monitoring tarixini ko'rish
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard icon={<DollarSign className="w-5 h-5" />} label="Jami kirim" value={fmt(analytics!.totalRevenue) + " so'm"} sub={`${analytics!.txCount} ta tranzaksiya`} />
              <KPICard icon={<Target className="w-5 h-5" />} label="O'rtacha chek" value={fmt(analytics!.avgCheck) + " so'm"} sub={`${analytics!.methodStats.length} ta usul`} />
              <KPICard icon={<Users className="w-5 h-5" />} label="Unique o'quvchilar" value={String(analytics!.churnRisks.length)} sub={`${analytics!.sinfStats.length} ta sinf`} />
              <KPICard icon={<AlertTriangle className="w-5 h-5" />} label="Churn risk (yuqori)" value={String(analytics!.churnRisks.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical').length)} sub="o'quvchi xavf ostida" alert />
            </div>

            {/* File badge + actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{fileName} — {data.length} qator</Badge>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span><Upload className="w-3.5 h-3.5 mr-1" /> Boshqa fayl</span>
                </Button>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
              </label>
              {user && (
                <>
                  <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                    Bazaga saqlash
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowMonitor(true); loadSnapshots(); }}>
                    <History className="w-3.5 h-3.5 mr-1" /> Monitoring
                  </Button>
                </>
              )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="revenue">
              <TabsList className="grid grid-cols-4 w-full max-w-lg">
                <TabsTrigger value="revenue"><PieChart className="w-4 h-4 mr-1" /> Revenue</TabsTrigger>
                <TabsTrigger value="abtest"><TestTube className="w-4 h-4 mr-1" /> A/B Test</TabsTrigger>
                <TabsTrigger value="churn"><Shield className="w-4 h-4 mr-1" /> Churn</TabsTrigger>
                <TabsTrigger value="ai"><Sparkles className="w-4 h-4 mr-1" /> AI</TabsTrigger>
              </TabsList>

              {/* ═══ REVENUE TAB ═══ */}
              <TabsContent value="revenue" className="space-y-4 mt-4">
                <div className="grid lg:grid-cols-2 gap-4">
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

                  <Card className="p-4 lg:col-span-2">
                    <h3 className="font-semibold text-sm mb-3">Revenue ulushi (usul bo'yicha)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <RePie>
                        <Pie data={analytics!.methodStats} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, pct }) => `${name} ${pct.toFixed(0)}%`}>
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
                  <Card className="p-4">
                    <h3 className="font-semibold text-sm mb-3">Risk taqsimoti</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <RePie>
                        <Pie data={analytics!.riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                          {analytics!.riskDistribution.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePie>
                    </ResponsiveContainer>
                  </Card>

                  <Card className="p-4 lg:col-span-2">
                    <h3 className="font-semibold text-sm mb-3">Risk Score vs To'lov summasi</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="riskScore" name="Risk" unit="%" />
                        <YAxis dataKey="totalPaid" name="To'lov" tickFormatter={fmt} />
                        <Tooltip formatter={(v: number, name: string) => name === "To'lov" ? fmt(v) + " so'm" : v + '%'} />
                        <Scatter data={analytics!.churnRisks} fill="hsl(var(--primary))">
                          {analytics!.churnRisks.map((r, i) => (
                            <Cell key={i} fill={r.riskLevel === 'critical' ? '#ef4444' : r.riskLevel === 'high' ? '#f97316' : r.riskLevel === 'medium' ? '#eab308' : '#22c55e'} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

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
                            <Badge variant={r.riskLevel === 'critical' || r.riskLevel === 'high' ? 'destructive' : r.riskLevel === 'medium' ? 'outline' : 'secondary'} className="text-[10px]">
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
              </TabsContent>

              {/* ═══ AI RECOMMENDATIONS TAB ═══ */}
              <TabsContent value="ai" className="space-y-4 mt-4">
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      AI Retention Strategiyasi
                    </h3>
                    <Button onClick={getAiRecommendations} disabled={aiLoading} size="sm">
                      {aiLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                      {aiLoading ? 'Tahlil qilmoqda...' : 'AI Tavsiya olish'}
                    </Button>
                  </div>

                  {!aiRecommendation && !aiLoading && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">AI har bir o'quvchi uchun shaxsiy retention strategiyasi beradi</p>
                      <p className="text-xs mt-1">Top 15 xavfli o'quvchi tahlil qilinadi</p>
                    </div>
                  )}

                  <AnimatePresence>
                    {aiRecommendation && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 rounded-lg p-4 max-h-[500px] overflow-y-auto"
                      >
                        <ReactMarkdown>{aiRecommendation}</ReactMarkdown>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* ═══ MONITORING PANEL ═══ */}
        <AnimatePresence>
          {showMonitor && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <History className="w-5 h-5 text-primary" /> Churn Risk Monitoring
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Haftalik avtomatik snapshot: Har dushanba 08:00
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowMonitor(false)}>Yopish</Button>
                </div>

                {snapshots.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    Hali saqlangan snapshot yo'q. "Bazaga saqlash" tugmasini bosing.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Week-over-week KPIs */}
                    {snapshots.length >= 2 && (() => {
                      const latest = snapshots[snapshots.length - 1];
                      const prev = snapshots[snapshots.length - 2];
                      const riskDelta = latest.avg_risk - prev.avg_risk;
                      const critDelta = latest.critical_count - prev.critical_count;
                      return (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-3 rounded-lg bg-muted/30">
                            <p className="text-[10px] text-muted-foreground">O'rtacha risk</p>
                            <p className="text-lg font-bold">{latest.avg_risk}%</p>
                            <p className={`text-[10px] font-medium ${riskDelta > 0 ? 'text-destructive' : riskDelta < 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                              {riskDelta > 0 ? '↑' : riskDelta < 0 ? '↓' : '→'} {Math.abs(riskDelta)}% vs oldingi hafta
                            </p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted/30">
                            <p className="text-[10px] text-muted-foreground">Critical</p>
                            <p className="text-lg font-bold text-destructive">{latest.critical_count}</p>
                            <p className={`text-[10px] font-medium ${critDelta > 0 ? 'text-destructive' : critDelta < 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                              {critDelta > 0 ? `+${critDelta}` : critDelta < 0 ? critDelta : '0'} vs oldingi
                            </p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted/30">
                            <p className="text-[10px] text-muted-foreground">Snapshotlar</p>
                            <p className="text-lg font-bold">{snapshots.length}</p>
                            <p className="text-[10px] text-muted-foreground">{snapshots[0].snapshot_date} dan beri</p>
                          </div>
                        </div>
                      );
                    })()}

                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={snapshots}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="snapshot_date" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="avg_risk" name="O'rtacha risk %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="critical_count" name="Critical" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="high_count" name="High" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="total_students" name="Jami" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="5 5" />
                      </LineChart>
                    </ResponsiveContainer>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="p-2">Sana</th>
                            <th className="p-2">O'quvchilar</th>
                            <th className="p-2">O'rtacha risk</th>
                            <th className="p-2">Δ Risk</th>
                            <th className="p-2">Critical</th>
                            <th className="p-2">High</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshots.map((s, i) => {
                            const prev = i > 0 ? snapshots[i - 1] : null;
                            const delta = prev ? s.avg_risk - prev.avg_risk : null;
                            return (
                              <tr key={i} className="border-b last:border-0">
                                <td className="p-2 text-xs">{s.snapshot_date}</td>
                                <td className="p-2 text-xs">{s.total_students}</td>
                                <td className="p-2 text-xs">{s.avg_risk}%</td>
                                <td className="p-2 text-xs">
                                  {delta !== null ? (
                                    <span className={delta > 0 ? 'text-destructive' : delta < 0 ? 'text-green-500' : ''}>
                                      {delta > 0 ? '+' : ''}{delta}%
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="p-2"><Badge variant="destructive" className="text-[10px]">{s.critical_count}</Badge></td>
                                <td className="p-2"><Badge variant="outline" className="text-[10px]">{s.high_count}</Badge></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
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
          <p>• Selection bias mavjud bo'lishi mumkin</p>
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
