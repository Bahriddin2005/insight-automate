import type { ColumnInfo, DatasetAnalysis } from './dataProcessor';

export interface DetectedKPI {
  id: string;
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  category: 'revenue' | 'growth' | 'engagement' | 'efficiency' | 'quality' | 'risk';
  icon: string; // lucide icon name
}

// Flexible column name matching
function normalize(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_\s-]+/g, ' ').trim();
}

function findColumn(columns: ColumnInfo[], aliases: string[]): ColumnInfo | undefined {
  const normalizedAliases = aliases.map(normalize);
  const cols = columns.map(c => ({ ...c, norm: normalize(c.name) }));

  // Exact match
  for (const alias of normalizedAliases) {
    const found = cols.find(c => c.norm === alias);
    if (found) return found;
  }
  // Starts with
  for (const alias of normalizedAliases) {
    const found = cols.find(c => c.norm.startsWith(alias));
    if (found) return found;
  }
  // Contains
  for (const alias of normalizedAliases) {
    const found = cols.find(c => c.norm.includes(alias));
    if (found) return found;
  }
  return undefined;
}

function computeGrowthRate(values: number[]): number {
  if (values.length < 2) return 0;
  const first = values[0] || 1;
  const last = values[values.length - 1];
  return ((last - first) / Math.abs(first)) * 100;
}

function computeMovingAverage(values: number[], window = 7): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export function detectIntelligentKPIs(analysis: DatasetAnalysis): DetectedKPI[] {
  const { columnInfo, cleanedData } = analysis;
  const kpis: DetectedKPI[] = [];

  const revenueCol = findColumn(columnInfo.filter(c => c.type === 'numeric'), ['revenue', 'sales', 'amount', 'total', 'income', 'gmv', 'price']);
  const costCol = findColumn(columnInfo.filter(c => c.type === 'numeric'), ['cost', 'expense', 'spend', 'cogs', 'expenditure']);
  const userIdCol = findColumn(columnInfo, ['user id', 'customer id', 'uid', 'user', 'client id', 'account id']);
  const dateCol = findColumn(columnInfo.filter(c => c.type === 'datetime'), ['date', 'timestamp', 'created at', 'time', 'order date', 'event date']);
  const tokenCol = findColumn(columnInfo.filter(c => c.type === 'numeric'), ['tokens', 'token count', 'input tokens', 'output tokens']);
  const latencyCol = findColumn(columnInfo.filter(c => c.type === 'numeric'), ['latency', 'response time', 'duration', 'elapsed']);

  // Revenue / Total Amount
  if (revenueCol?.stats) {
    const total = cleanedData.reduce((sum, r) => sum + (Number(r[revenueCol.name]) || 0), 0);
    kpis.push({
      id: 'total_revenue', label: 'Total Revenue', value: formatNumber(total),
      category: 'revenue', icon: 'DollarSign',
    });

    // Revenue trend (growth rate)
    if (dateCol) {
      const sorted = sortByDate(cleanedData, dateCol.name);
      const dailyRevenue = aggregateByDay(sorted, dateCol.name, revenueCol.name);
      const values = dailyRevenue.map(d => d.value);
      const growth = computeGrowthRate(values);
      kpis.push({
        id: 'revenue_growth', label: 'Revenue Growth', value: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`,
        change: growth >= 0 ? 'Uptrend' : 'Downtrend',
        changeType: growth >= 0 ? 'positive' : 'negative',
        category: 'growth', icon: 'TrendingUp',
      });

      // Moving average
      const ma = computeMovingAverage(values);
      const latestMa = ma[ma.length - 1] || 0;
      kpis.push({
        id: 'revenue_ma', label: '7-Day Moving Avg', value: formatNumber(latestMa),
        category: 'revenue', icon: 'Activity',
      });
    }
  }

  // Margin
  if (revenueCol?.stats && costCol?.stats) {
    const totalRevenue = cleanedData.reduce((s, r) => s + (Number(r[revenueCol.name]) || 0), 0);
    const totalCost = cleanedData.reduce((s, r) => s + (Number(r[costCol.name]) || 0), 0);
    const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
    kpis.push({
      id: 'margin', label: 'Profit Margin', value: `${margin.toFixed(1)}%`,
      changeType: margin >= 20 ? 'positive' : margin >= 0 ? 'neutral' : 'negative',
      category: 'efficiency', icon: 'Percent',
    });
  }

  // DAU / MAU / Retention
  if (userIdCol && dateCol) {
    const uniqueUsers = new Set(cleanedData.map(r => String(r[userIdCol.name]))).size;
    kpis.push({
      id: 'unique_users', label: 'Unique Users', value: formatNumber(uniqueUsers),
      category: 'engagement', icon: 'Users',
    });

    // DAU estimate (avg unique users per day)
    const dayUsers: Record<string, Set<string>> = {};
    cleanedData.forEach(r => {
      const d = new Date(String(r[dateCol.name]));
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().split('T')[0];
      if (!dayUsers[key]) dayUsers[key] = new Set();
      dayUsers[key].add(String(r[userIdCol.name]));
    });
    const days = Object.keys(dayUsers);
    if (days.length > 0) {
      const dau = Math.round(days.reduce((s, d) => s + dayUsers[d].size, 0) / days.length);
      kpis.push({
        id: 'avg_dau', label: 'Avg DAU', value: formatNumber(dau),
        category: 'engagement', icon: 'UserCheck',
      });

      // MAU estimate
      const monthUsers: Record<string, Set<string>> = {};
      cleanedData.forEach(r => {
        const d = new Date(String(r[dateCol.name]));
        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthUsers[key]) monthUsers[key] = new Set();
        monthUsers[key].add(String(r[userIdCol.name]));
      });
      const months = Object.keys(monthUsers).sort();
      if (months.length > 0) {
        const latestMau = monthUsers[months[months.length - 1]].size;
        kpis.push({
          id: 'latest_mau', label: 'Latest MAU', value: formatNumber(latestMau),
          category: 'engagement', icon: 'Calendar',
        });

        if (dau > 0 && latestMau > 0) {
          const stickiness = ((dau / latestMau) * 100);
          kpis.push({
            id: 'stickiness', label: 'Stickiness (DAU/MAU)', value: `${stickiness.toFixed(1)}%`,
            changeType: stickiness >= 20 ? 'positive' : 'neutral',
            category: 'engagement', icon: 'Zap',
          });
        }
      }
    }
  }

  // AI Performance KPIs
  if (tokenCol?.stats) {
    const avgTokens = tokenCol.stats.mean;
    kpis.push({
      id: 'avg_tokens', label: 'Avg Tokens', value: formatNumber(Math.round(avgTokens)),
      category: 'efficiency', icon: 'Cpu',
    });
  }
  if (latencyCol?.stats) {
    const avgLatency = latencyCol.stats.mean;
    kpis.push({
      id: 'avg_latency', label: 'Avg Latency', value: `${avgLatency.toFixed(0)}ms`,
      changeType: avgLatency < 500 ? 'positive' : avgLatency < 2000 ? 'neutral' : 'negative',
      category: 'efficiency', icon: 'Clock',
    });
  }
  if (tokenCol?.stats && costCol?.stats) {
    const totalTokens = cleanedData.reduce((s, r) => s + (Number(r[tokenCol.name]) || 0), 0);
    const totalCost = cleanedData.reduce((s, r) => s + (Number(r[costCol.name]) || 0), 0);
    if (totalTokens > 0) {
      const costPer1k = (totalCost / totalTokens) * 1000;
      kpis.push({
        id: 'cost_per_1k', label: 'Cost / 1K Tokens', value: `$${costPer1k.toFixed(4)}`,
        category: 'efficiency', icon: 'Coins',
      });
    }
  }

  return kpis;
}

// Cohort analysis
export interface CohortData {
  cohort: string;
  periods: number[];
  sizes: number[];
}

export function computeCohorts(data: Record<string, unknown>[], userCol: string, dateCol: string): CohortData[] {
  // Group users by first appearance month
  const userFirstMonth: Record<string, string> = {};
  const userMonths: Record<string, Set<string>> = {};

  data.forEach(r => {
    const uid = String(r[userCol] ?? '');
    const d = new Date(String(r[dateCol]));
    if (!uid || isNaN(d.getTime())) return;
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (!userFirstMonth[uid] || month < userFirstMonth[uid]) {
      userFirstMonth[uid] = month;
    }
    if (!userMonths[uid]) userMonths[uid] = new Set();
    userMonths[uid].add(month);
  });

  // Build cohorts
  const cohortUsers: Record<string, string[]> = {};
  Object.entries(userFirstMonth).forEach(([uid, month]) => {
    if (!cohortUsers[month]) cohortUsers[month] = [];
    cohortUsers[month].push(uid);
  });

  const allMonths = [...new Set(Object.values(userFirstMonth))].sort();
  
  return allMonths.slice(0, 12).map(cohort => {
    const users = cohortUsers[cohort] || [];
    const cohortIdx = allMonths.indexOf(cohort);
    const maxPeriods = Math.min(allMonths.length - cohortIdx, 6);
    
    const periods: number[] = [];
    const sizes: number[] = [];
    
    for (let p = 0; p < maxPeriods; p++) {
      const targetMonth = allMonths[cohortIdx + p];
      const retained = users.filter(uid => userMonths[uid]?.has(targetMonth)).length;
      periods.push(users.length > 0 ? (retained / users.length) * 100 : 0);
      sizes.push(retained);
    }
    
    return { cohort, periods, sizes };
  });
}

// Funnel analysis — detect sequential stages
export interface FunnelStep {
  name: string;
  count: number;
  percent: number;
  dropoff: number;
}

export function detectFunnel(data: Record<string, unknown>[], columns: ColumnInfo[]): FunnelStep[] | null {
  // Look for status/stage/step column
  const stageCol = findColumn(columns.filter(c => c.type === 'categorical'), [
    'status', 'stage', 'step', 'funnel', 'event', 'action', 'phase', 'state',
  ]);
  if (!stageCol?.topValues || stageCol.topValues.length < 2) return null;

  const total = data.length;
  const steps = stageCol.topValues.slice(0, 8);
  let prev = total;
  
  return steps.map((step, i) => {
    const dropoff = i === 0 ? 0 : ((prev - step.count) / prev) * 100;
    const result = {
      name: step.value,
      count: step.count,
      percent: (step.count / total) * 100,
      dropoff: Math.max(0, dropoff),
    };
    prev = step.count;
    return result;
  });
}

// Helpers
function sortByDate(data: Record<string, unknown>[], col: string) {
  return [...data].sort((a, b) => {
    const da = new Date(String(a[col]));
    const db = new Date(String(b[col]));
    return da.getTime() - db.getTime();
  });
}

function aggregateByDay(data: Record<string, unknown>[], dateCol: string, valCol: string) {
  const grouped: Record<string, number> = {};
  data.forEach(r => {
    const d = new Date(String(r[dateCol]));
    if (isNaN(d.getTime())) return;
    const key = d.toISOString().split('T')[0];
    grouped[key] = (grouped[key] || 0) + (Number(r[valCol]) || 0);
  });
  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
