import { BarChart3, Brain, DollarSign, Rocket, TrendingUp, Users, Zap, Shield, Target, Activity } from 'lucide-react';

export type CaseCategory = 'product' | 'ai' | 'finance' | 'growth';

export interface CaseStudy {
  id: string;
  category: CaseCategory;
  title: string;
  subtitle: string;
  company: string;
  role: string;
  duration: string;
  icon: string;
  tags: string[];
  problemStatement: string;
  datasetOverview: string;
  cleaningProcess: string[];
  kpis: { name: string; value: string; change: string; trend: 'up' | 'down' | 'neutral' }[];
  sqlQueries: { title: string; query: string; explanation: string }[];
  pythonCode: string;
  insights: string[];
  executiveSummary: string;
  recommendations: string[];
  impact: string;
  tools: string[];
  sampleData: Record<string, unknown>[];
}

export const CATEGORIES: Record<CaseCategory, { label: string; description: string; color: string; icon: string }> = {
  product: {
    label: 'Product Analytics',
    description: 'Google/Meta-style user behavior & engagement analysis',
    color: 'hsl(var(--primary))',
    icon: 'BarChart3',
  },
  ai: {
    label: 'AI/ML Analytics',
    description: 'OpenAI-style model performance & token economics',
    color: 'hsl(var(--chart-4))',
    icon: 'Brain',
  },
  finance: {
    label: 'Finance Analytics',
    description: 'Bloomberg-style revenue modeling & risk analysis',
    color: 'hsl(var(--chart-3))',
    icon: 'DollarSign',
  },
  growth: {
    label: 'Growth Analytics',
    description: 'Startup-style acquisition, activation & retention',
    color: 'hsl(var(--accent))',
    icon: 'Rocket',
  },
};

export const CASE_STUDIES: CaseStudy[] = [
  // ─── PRODUCT ANALYTICS ───
  {
    id: 'user-engagement-optimization',
    category: 'product',
    title: 'User Engagement Optimization',
    subtitle: 'Identifying key drivers of DAU/MAU ratio decline',
    company: 'TechCorp (Google-style)',
    role: 'Senior Product Data Analyst',
    duration: '6 weeks',
    icon: 'BarChart3',
    tags: ['DAU/MAU', 'Retention', 'Feature Adoption', 'A/B Testing'],
    problemStatement: 'DAU/MAU ratio dropped from 42% to 35% over Q3 2025. Product leadership needed root-cause analysis and actionable recommendations to reverse the trend before Q4 planning.',
    datasetOverview: '2.4M event logs across 180K users over 90 days. Columns: user_id, event_type, timestamp, session_duration, feature_used, platform, country, subscription_tier.',
    cleaningProcess: [
      'Removed 12,340 bot-generated events (session_duration < 1s)',
      'Parsed timestamps to UTC, filled 0.3% missing values with forward-fill',
      'Deduplicated 4,200 duplicate event entries',
      'Standardized platform names (iOS/ios/iPhone → iOS)',
      'Quality Score: 96/100',
    ],
    kpis: [
      { name: 'DAU/MAU', value: '35.2%', change: '-16.2%', trend: 'down' },
      { name: 'Avg Session Duration', value: '4.2 min', change: '-22%', trend: 'down' },
      { name: 'Feature Adoption Rate', value: '28%', change: '-8%', trend: 'down' },
      { name: 'D7 Retention', value: '41%', change: '-5pp', trend: 'down' },
      { name: 'Power Users', value: '12.4K', change: '-18%', trend: 'down' },
      { name: 'Session Frequency', value: '3.1/week', change: '-0.8', trend: 'down' },
    ],
    sqlQueries: [
      {
        title: 'DAU/MAU Trend by Week',
        query: `SELECT 
  DATE_TRUNC('week', event_date) AS week,
  COUNT(DISTINCT CASE WHEN event_date = CURRENT_DATE THEN user_id END)::FLOAT /
  COUNT(DISTINCT user_id) AS dau_mau_ratio
FROM user_events
WHERE event_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY 1
ORDER BY 1;`,
        explanation: 'Calculates the rolling DAU/MAU ratio weekly to identify the inflection point where engagement started declining.',
      },
      {
        title: 'Feature Usage Correlation with Retention',
        query: `WITH feature_users AS (
  SELECT user_id, feature_used, COUNT(*) AS usage_count
  FROM user_events
  WHERE feature_used IS NOT NULL
  GROUP BY 1, 2
),
retained AS (
  SELECT user_id, 1 AS retained
  FROM user_events
  WHERE event_date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY 1
)
SELECT f.feature_used,
  AVG(CASE WHEN r.retained = 1 THEN 1.0 ELSE 0 END) AS retention_rate,
  COUNT(DISTINCT f.user_id) AS users
FROM feature_users f
LEFT JOIN retained r ON f.user_id = r.user_id
GROUP BY 1
ORDER BY retention_rate DESC;`,
        explanation: 'Identifies which features are most correlated with user retention, enabling product prioritization.',
      },
    ],
    pythonCode: `import pandas as pd
import plotly.express as px

# Load and prepare data
df = pd.read_csv('user_events.csv', parse_dates=['timestamp'])
df['date'] = df['timestamp'].dt.date
df['week'] = df['timestamp'].dt.isocalendar().week

# DAU/MAU calculation
dau = df.groupby('date')['user_id'].nunique()
mau = df.groupby(df['date'].apply(lambda x: x.month))['user_id'].nunique()

# Cohort retention matrix
df['cohort'] = df.groupby('user_id')['date'].transform('min')
df['cohort_month'] = pd.to_datetime(df['cohort']).dt.to_period('M')
df['period'] = (pd.to_datetime(df['date']).dt.to_period('M') - df['cohort_month']).apply(lambda x: x.n)

cohort_pivot = df.groupby(['cohort_month', 'period'])['user_id'].nunique().unstack()
retention = cohort_pivot.div(cohort_pivot[0], axis=0) * 100

fig = px.imshow(retention, text_auto='.0f', color_continuous_scale='Tealgrn',
                title='Cohort Retention Heatmap (%)')
fig.show()`,
    insights: [
      'The DAU/MAU decline correlates with a UI redesign shipped in Week 28 — users who experienced the new onboarding flow had 23% lower D7 retention.',
      'Power users (5+ sessions/week) dropped by 18%, primarily on Android where the new navigation increased time-to-core-action by 2.3 seconds.',
      'Feature "Quick Share" shows 72% retention correlation but only 28% adoption — massive untapped potential.',
      'Users from organic search have 2.1x higher LTV than paid acquisition channels.',
    ],
    executiveSummary: 'The Q3 engagement decline is primarily driven by the Week 28 UI redesign, which increased friction in the core user journey. Android users were disproportionately affected. Immediate rollback of navigation changes and investment in Quick Share feature adoption could recover 60% of lost engagement within 4 weeks.',
    recommendations: [
      'Roll back Android navigation changes — expected +8% DAU recovery within 2 weeks',
      'Launch Quick Share onboarding tooltip campaign — target 50% adoption by Q4',
      'Segment paid vs organic users in retention analysis for acquisition budget reallocation',
      'Implement session quality score to detect engagement degradation early',
    ],
    impact: 'Projected +15% DAU/MAU recovery within 6 weeks, saving estimated $2.4M in re-acquisition costs.',
    tools: ['PostgreSQL', 'Python', 'Pandas', 'Plotly', 'dbt', 'Looker'],
    sampleData: Array.from({ length: 50 }, (_, i) => ({
      user_id: `usr_${1000 + i}`,
      event_type: ['page_view', 'click', 'share', 'purchase', 'signup'][i % 5],
      timestamp: new Date(2025, 6, 1 + Math.floor(i / 5), Math.floor(Math.random() * 24)).toISOString(),
      session_duration: Math.round(30 + Math.random() * 600),
      feature_used: ['dashboard', 'search', 'quick_share', 'settings', 'notifications'][i % 5],
      platform: ['iOS', 'Android', 'Web'][i % 3],
      country: ['US', 'UK', 'DE', 'JP', 'BR'][i % 5],
      subscription_tier: ['free', 'pro', 'enterprise'][i % 3],
    })),
  },
  // ─── AI/ML ANALYTICS ───
  {
    id: 'llm-cost-optimization',
    category: 'ai',
    title: 'LLM Cost & Performance Optimization',
    subtitle: 'Reducing token costs by 40% while maintaining quality',
    company: 'AI Platform (OpenAI-style)',
    role: 'AI Product Analytics Lead',
    duration: '4 weeks',
    icon: 'Brain',
    tags: ['Token Economics', 'Latency', 'Model Performance', 'Cost Optimization'],
    problemStatement: 'API costs grew 3x faster than revenue in Q2. Need to identify cost-efficiency opportunities across model usage patterns without degrading user experience (CSAT > 4.2/5).',
    datasetOverview: '8.7M API calls over 60 days. Columns: request_id, model, tokens_in, tokens_out, latency_ms, cost_usd, user_tier, use_case, quality_score, timestamp.',
    cleaningProcess: [
      'Filtered 45K failed requests (status != 200)',
      'Removed outlier latencies > 30s (0.2% of requests)',
      'Normalized cost_usd to consistent pricing model',
      'Categorized 12 use_case patterns from free-text',
      'Quality Score: 98/100',
    ],
    kpis: [
      { name: 'Avg Cost/Request', value: '$0.032', change: '+180%', trend: 'down' },
      { name: 'P95 Latency', value: '2.8s', change: '+45%', trend: 'down' },
      { name: 'Token Efficiency', value: '0.72', change: '-15%', trend: 'down' },
      { name: 'CSAT Score', value: '4.3/5', change: '-0.2', trend: 'down' },
      { name: 'Daily API Calls', value: '145K', change: '+210%', trend: 'up' },
      { name: 'Revenue/Cost Ratio', value: '1.8x', change: '-40%', trend: 'down' },
    ],
    sqlQueries: [
      {
        title: 'Cost Distribution by Model & Use Case',
        query: `SELECT model, use_case,
  COUNT(*) AS requests,
  ROUND(AVG(cost_usd), 4) AS avg_cost,
  ROUND(SUM(cost_usd), 2) AS total_cost,
  ROUND(AVG(quality_score), 2) AS avg_quality
FROM api_calls
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY model, use_case
ORDER BY total_cost DESC
LIMIT 20;`,
        explanation: 'Identifies the most expensive model-use case combinations to target for optimization.',
      },
    ],
    pythonCode: `import pandas as pd
import plotly.express as px

df = pd.read_csv('api_calls.csv')

# Cost per quality point analysis
df['cost_per_quality'] = df['cost_usd'] / df['quality_score'].clip(lower=0.1)

# Model efficiency comparison
efficiency = df.groupby('model').agg(
    avg_cost=('cost_usd', 'mean'),
    avg_quality=('quality_score', 'mean'),
    avg_latency=('latency_ms', 'mean'),
    total_requests=('request_id', 'count')
).reset_index()

efficiency['efficiency_score'] = efficiency['avg_quality'] / efficiency['avg_cost']

fig = px.scatter(efficiency, x='avg_cost', y='avg_quality', size='total_requests',
                 color='model', title='Model Cost vs Quality Frontier')
fig.show()`,
    insights: [
      '62% of costs come from GPT-4 calls for simple classification tasks that GPT-3.5 handles at 94% equivalent quality — immediate 40% cost reduction opportunity.',
      'Prompt length optimization: top 10% longest prompts account for 35% of token costs but only 8% improvement in quality scores.',
      'Caching identical requests could save 18% of total costs — 12% of requests are exact duplicates within 1-hour windows.',
      'Enterprise tier users generate 4.2x revenue per API dollar vs free tier users.',
    ],
    executiveSummary: 'API cost growth is unsustainable at current trajectory. The primary driver is model over-provisioning: 62% of GPT-4 usage can be safely routed to GPT-3.5 with <6% quality degradation. Combined with prompt optimization and response caching, we can reduce costs by 40% while maintaining CSAT above 4.2.',
    recommendations: [
      'Implement intelligent model routing — route simple tasks to GPT-3.5, save $180K/month',
      'Deploy response cache with 1-hour TTL for duplicate requests — save $45K/month',
      'Set prompt length guidelines: max 2000 tokens input for standard use cases',
      'Introduce usage-based pricing for free tier to improve revenue/cost ratio',
    ],
    impact: 'Projected $2.7M annual savings with maintained quality metrics (CSAT ≥ 4.2/5).',
    tools: ['PostgreSQL', 'Python', 'Pandas', 'Scikit-learn', 'Plotly', 'Grafana'],
    sampleData: Array.from({ length: 50 }, (_, i) => ({
      request_id: `req_${10000 + i}`,
      model: ['gpt-4', 'gpt-3.5', 'gpt-4', 'gpt-3.5', 'gpt-4o'][i % 5],
      tokens_in: Math.round(100 + Math.random() * 2000),
      tokens_out: Math.round(50 + Math.random() * 1000),
      latency_ms: Math.round(200 + Math.random() * 3000),
      cost_usd: +(0.001 + Math.random() * 0.1).toFixed(4),
      user_tier: ['free', 'pro', 'enterprise'][i % 3],
      use_case: ['classification', 'generation', 'summarization', 'translation', 'code'][i % 5],
      quality_score: +(3.5 + Math.random() * 1.5).toFixed(2),
      timestamp: new Date(2025, 7, 1 + Math.floor(i / 5)).toISOString(),
    })),
  },
  // ─── FINANCE ANALYTICS ───
  {
    id: 'revenue-forecasting-model',
    category: 'finance',
    title: 'Revenue Forecasting & Risk Model',
    subtitle: 'Building a multi-scenario revenue prediction framework',
    company: 'FinServ Corp (Bloomberg-style)',
    role: 'Financial Data Analyst',
    duration: '8 weeks',
    icon: 'DollarSign',
    tags: ['Revenue Modeling', 'Risk Analysis', 'Volatility', 'Forecasting'],
    problemStatement: 'Q2 revenue missed forecast by 12%. CFO needs a more accurate forecasting model with scenario analysis (bear/base/bull) and early warning indicators for Q3-Q4 planning.',
    datasetOverview: '36 months of financial data across 8 business units. Columns: date, business_unit, revenue, cost, margin, headcount, churn_rate, new_customers, market_index.',
    cleaningProcess: [
      'Reconciled 23 revenue discrepancies against GL data',
      'Interpolated 4 missing monthly data points using linear regression',
      'Normalized currency to USD using ECB daily rates',
      'Removed 2 outlier months (M&A one-time effects)',
      'Quality Score: 94/100',
    ],
    kpis: [
      { name: 'MRR', value: '$4.2M', change: '+8%', trend: 'up' },
      { name: 'Gross Margin', value: '72%', change: '-3pp', trend: 'down' },
      { name: 'Revenue Growth', value: '24% YoY', change: '-6pp', trend: 'down' },
      { name: 'CAC Payback', value: '14 months', change: '+3mo', trend: 'down' },
      { name: 'Net Revenue Retention', value: '108%', change: '-7pp', trend: 'down' },
      { name: 'Burn Multiple', value: '1.4x', change: '+0.3', trend: 'down' },
    ],
    sqlQueries: [
      {
        title: 'Monthly Revenue Trend with Rolling Average',
        query: `SELECT date,
  SUM(revenue) AS total_revenue,
  AVG(SUM(revenue)) OVER (ORDER BY date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rolling_3m_avg,
  SUM(revenue) - LAG(SUM(revenue), 12) OVER (ORDER BY date) AS yoy_change
FROM financial_data
GROUP BY date
ORDER BY date;`,
        explanation: 'Tracks revenue with 3-month rolling average to smooth seasonality and highlights year-over-year growth trajectory.',
      },
    ],
    pythonCode: `import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

df = pd.read_csv('financial_data.csv', parse_dates=['date'])

# Revenue forecasting with scenario analysis
monthly = df.groupby('date')['revenue'].sum().reset_index()
monthly['month_num'] = range(len(monthly))

model = LinearRegression().fit(monthly[['month_num']], monthly['revenue'])
future = pd.DataFrame({'month_num': range(len(monthly), len(monthly) + 6)})

# Scenarios
base = model.predict(future)
bull = base * 1.15  # +15% upside
bear = base * 0.85  # -15% downside

print("Q3 Base Forecast:", base[:3].sum())
print("Q3 Bull Forecast:", bull[:3].sum())
print("Q3 Bear Forecast:", bear[:3].sum())`,
    insights: [
      'Revenue miss driven by Enterprise segment: 3 large deals slipped from Q2 to Q3 ($1.8M impact). Pipeline velocity declined 22% indicating systemic issue, not one-off.',
      'SMB segment growing at 34% YoY — fastest growth but lowest margin (58% vs 78% enterprise). Need to monitor unit economics.',
      'Cost structure becoming less efficient: headcount grew 28% but revenue only 24% — operating leverage deteriorating.',
      'Net Revenue Retention declining from 115% to 108% signals increasing competitive pressure in mid-market.',
    ],
    executiveSummary: 'The Q2 miss was primarily driven by Enterprise deal slippage and deteriorating pipeline velocity, not market conditions. The forecasting model now incorporates deal-stage weighted pipeline and macro indicators. Base case Q3 forecast: $13.2M (+6% QoQ). Key risk: if pipeline velocity doesn\'t recover, bear case drops to $11.2M.',
    recommendations: [
      'Implement deal-stage weighted pipeline scoring to improve forecast accuracy to ±5%',
      'Accelerate SMB self-serve to reduce CAC and improve margin structure',
      'Establish monthly operating leverage review (revenue growth / headcount growth)',
      'Create early warning dashboard with 3-week leading indicators for revenue risk',
    ],
    impact: 'New forecasting model reduces forecast error from 12% to projected 4-5%, enabling better capital allocation.',
    tools: ['PostgreSQL', 'Python', 'Pandas', 'Scikit-learn', 'Tableau', 'Excel'],
    sampleData: Array.from({ length: 36 }, (_, i) => ({
      date: new Date(2023, i, 1).toISOString().slice(0, 10),
      business_unit: ['Enterprise', 'SMB', 'Mid-Market'][i % 3],
      revenue: Math.round(800000 + i * 50000 + Math.random() * 200000),
      cost: Math.round(250000 + i * 15000 + Math.random() * 80000),
      margin: +(0.6 + Math.random() * 0.2).toFixed(3),
      headcount: 120 + Math.floor(i * 2.5),
      churn_rate: +(0.02 + Math.random() * 0.03).toFixed(4),
      new_customers: Math.round(40 + Math.random() * 30),
      market_index: +(100 + i * 1.5 + Math.random() * 10).toFixed(2),
    })),
  },
  // ─── GROWTH ANALYTICS ───
  {
    id: 'acquisition-funnel-optimization',
    category: 'growth',
    title: 'Acquisition Funnel Optimization',
    subtitle: 'Reducing CAC by 35% through funnel stage analysis',
    company: 'GrowthStartup (Series B)',
    role: 'Growth Analytics Lead',
    duration: '5 weeks',
    icon: 'Rocket',
    tags: ['CAC', 'LTV', 'Funnel Analysis', 'Channel Attribution'],
    problemStatement: 'CAC increased 45% in Q2 while conversion rates dropped across all funnel stages. Board requires a data-driven plan to achieve CAC < $85 for the Series C narrative.',
    datasetOverview: '420K funnel events across 85K users, 6 acquisition channels, 90 days. Columns: user_id, channel, stage, timestamp, amount_spent, converted, ltv_predicted, cohort_week.',
    cleaningProcess: [
      'Reconciled attribution data with UTM parameters (92% match rate)',
      'Removed 8K internal test accounts',
      'Standardized channel names across 3 tracking systems',
      'Filled missing LTV predictions using cohort-based estimates',
      'Quality Score: 91/100',
    ],
    kpis: [
      { name: 'CAC', value: '$124', change: '+45%', trend: 'down' },
      { name: 'LTV:CAC Ratio', value: '2.1x', change: '-35%', trend: 'down' },
      { name: 'Signup→Activation', value: '34%', change: '-12pp', trend: 'down' },
      { name: 'Activation→Purchase', value: '18%', change: '-6pp', trend: 'down' },
      { name: 'D30 Retention', value: '28%', change: '-8pp', trend: 'down' },
      { name: 'Payback Period', value: '11 months', change: '+4mo', trend: 'down' },
      { name: 'Viral Coefficient', value: '0.3', change: '-0.15', trend: 'down' },
    ],
    sqlQueries: [
      {
        title: 'Channel CAC with LTV Ratio',
        query: `SELECT channel,
  COUNT(DISTINCT user_id) AS users,
  SUM(amount_spent) / COUNT(DISTINCT CASE WHEN converted THEN user_id END) AS cac,
  AVG(ltv_predicted) AS avg_ltv,
  AVG(ltv_predicted) / NULLIF(SUM(amount_spent) / COUNT(DISTINCT CASE WHEN converted THEN user_id END), 0) AS ltv_cac_ratio
FROM funnel_events
WHERE timestamp >= NOW() - INTERVAL '90 days'
GROUP BY channel
ORDER BY ltv_cac_ratio DESC;`,
        explanation: 'Compares channel efficiency by both acquisition cost and predicted lifetime value to optimize budget allocation.',
      },
    ],
    pythonCode: `import pandas as pd
import plotly.express as px

df = pd.read_csv('funnel_events.csv')

# Funnel conversion analysis
stages = ['visit', 'signup', 'activation', 'purchase', 'retention']
funnel = df.groupby('stage')['user_id'].nunique().reindex(stages)
funnel_pct = (funnel / funnel.iloc[0] * 100).round(1)

# Channel efficiency matrix
channel_metrics = df.groupby('channel').agg(
    users=('user_id', 'nunique'),
    spend=('amount_spent', 'sum'),
    conversions=('converted', 'sum'),
    avg_ltv=('ltv_predicted', 'mean')
).reset_index()
channel_metrics['cac'] = channel_metrics['spend'] / channel_metrics['conversions']
channel_metrics['ltv_cac'] = channel_metrics['avg_ltv'] / channel_metrics['cac']

fig = px.bar(channel_metrics, x='channel', y='ltv_cac', color='cac',
             title='Channel LTV:CAC Ratio', color_continuous_scale='RdYlGn')
fig.show()`,
    insights: [
      'Paid social CAC increased 67% due to iOS privacy changes — ROAS dropped below 1.0x, making it unprofitable.',
      'Content/SEO channel has 4.8x LTV:CAC but only receives 12% of budget — massive underinvestment.',
      'Activation rate drop traced to new onboarding flow: Step 3 (connect data source) has 52% drop-off rate.',
      'Referral program generates users with 2.3x higher retention but referral UX has 3 friction points.',
    ],
    executiveSummary: 'CAC inflation is driven by over-reliance on paid social (52% of budget, 0.9x ROAS) while high-efficiency channels (Content: 4.8x LTV:CAC, Referral: 3.2x) are severely underfunded. Rebalancing acquisition budget and fixing the onboarding activation bottleneck can reduce blended CAC to $78 within 8 weeks.',
    recommendations: [
      'Shift 30% of paid social budget to content/SEO — expected CAC reduction to $92 in 4 weeks',
      'Fix onboarding Step 3: add skip option and progressive disclosure — target 65% pass-through',
      'Invest in referral program UX: reduce sharing friction, add incentive tiers — target viral coefficient 0.5',
      'Implement incrementality testing for all paid channels to measure true marginal ROAS',
    ],
    impact: 'Projected CAC reduction from $124 to $78 (-37%) within 8 weeks, improving LTV:CAC to 3.4x for Series C narrative.',
    tools: ['PostgreSQL', 'Python', 'Pandas', 'Amplitude', 'Plotly', 'Google Analytics'],
    sampleData: Array.from({ length: 50 }, (_, i) => ({
      user_id: `u_${5000 + i}`,
      channel: ['paid_social', 'organic_search', 'referral', 'content', 'paid_search', 'email'][i % 6],
      stage: ['visit', 'signup', 'activation', 'purchase', 'retention'][i % 5],
      timestamp: new Date(2025, 7, 1 + Math.floor(i / 5)).toISOString(),
      amount_spent: +(Math.random() * 50).toFixed(2),
      converted: Math.random() > 0.6,
      ltv_predicted: Math.round(100 + Math.random() * 400),
      cohort_week: `W${26 + (i % 12)}`,
    })),
  },
];

export function getCaseStudy(id: string): CaseStudy | undefined {
  return CASE_STUDIES.find(c => c.id === id);
}

export function getCaseStudiesByCategory(category: CaseCategory): CaseStudy[] {
  return CASE_STUDIES.filter(c => c.category === category);
}
