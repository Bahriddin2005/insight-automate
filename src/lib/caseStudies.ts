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
  {
    id: 'feature-adoption-cohort',
    category: 'product',
    title: 'Feature Adoption Cohort Analysis',
    subtitle: 'Identifying onboarding friction and feature stickiness by cohort',
    company: 'SaaS Platform (Slack-style)',
    role: 'Product Data Analyst',
    duration: '4 weeks',
    icon: 'BarChart3',
    tags: ['Cohort Analysis', 'Feature Adoption', 'Activation', 'Onboarding'],
    problemStatement: 'New user activation rate dropped from 68% to 52% after a product redesign. Need to identify which onboarding steps cause drop-off and which features correlate with long-term retention.',
    datasetOverview: '95K signup events with feature usage logs. Columns: user_id, cohort_week, signup_date, step_completed, feature_first_used, days_to_activation, activated, country.',
    cleaningProcess: [
      'Mapped 14 onboarding steps to standardized IDs',
      'Filled missing feature_first_used with last-known usage',
      'Removed 2.1K test/trial accounts',
      'Quality Score: 95/100',
    ],
    kpis: [
      { name: 'Activation Rate', value: '52%', change: '-16pp', trend: 'down' },
      { name: 'D1 Activation', value: '34%', change: '-11pp', trend: 'down' },
      { name: 'Step 3 Drop-off', value: '42%', change: '+18pp', trend: 'down' },
      { name: 'Time to Activation', value: '4.2 days', change: '+1.8d', trend: 'down' },
      { name: 'Feature Stickiness', value: '0.61', change: '-0.12', trend: 'down' },
      { name: 'Cohort Retention D30', value: '38%', change: '-7pp', trend: 'down' },
    ],
    sqlQueries: [
      {
        title: 'Step Funnel Conversion',
        query: `SELECT step_completed, 
  COUNT(DISTINCT user_id) AS users,
  SUM(CASE WHEN activated THEN 1 ELSE 0 END)::FLOAT / COUNT(*) AS activation_rate
FROM onboarding_funnel
GROUP BY step_completed
ORDER BY step_completed;`,
        explanation: 'Tracks conversion at each onboarding step to identify friction points.',
      },
    ],
    pythonCode: `import pandas as pd
df = pd.read_csv('onboarding_funnel.csv')
funnel = df.groupby('step_completed').agg(users=('user_id','nunique'), activated=('activated','sum'))
funnel['rate'] = funnel['activated'] / funnel['users']
print(funnel)`,
    insights: [
      'Step 3 (connect first integration) has 42% drop-off — highest friction. Users who skip have 2.1x lower D30 retention.',
      'Cohort from Week 24 (post-redesign) shows 18% lower activation than prior cohorts.',
      'Users who complete Step 5 within 48 hours have 73% D30 retention vs 22% for those who take 5+ days.',
    ],
    executiveSummary: 'Onboarding Step 3 is the primary activation bottleneck. Making it optional or adding a "Skip for now" option could recover 8-12pp activation with minimal retention impact. Post-redesign cohorts show systematic decline.',
    recommendations: [
      'Add optional skip for Step 3 — A/B test with 20% of cohort',
      'Add in-app progress indicator to reduce abandonment',
      'Trigger re-engagement email 24h after Step 2 completion',
    ],
    impact: 'Projected +10pp activation recovery within 6 weeks.',
    tools: ['PostgreSQL', 'Python', 'Amplitude', 'dbt'],
    sampleData: Array.from({ length: 60 }, (_, i) => ({
      user_id: `u_${2000 + i}`,
      cohort_week: `W${20 + (i % 8)}`,
      signup_date: new Date(2025, 5, 1 + (i % 28)).toISOString().slice(0, 10),
      step_completed: Math.min(7, Math.floor(i / 8) + 1),
      feature_first_used: ['messaging', 'channels', 'integrations', 'search'][i % 4],
      days_to_activation: Math.round(1 + Math.random() * 10) || null,
      activated: Math.random() > 0.45,
      country: ['US', 'UK', 'DE', 'IN', 'BR'][i % 5],
    })),
  },
  {
    id: 'a-b-test-velocity',
    category: 'product',
    title: 'A/B Test Velocity & Power Analysis',
    subtitle: 'Optimizing experimentation throughput and statistical rigor',
    company: 'E-commerce (Shopify-style)',
    role: 'Experimentation Lead',
    duration: '3 weeks',
    icon: 'BarChart3',
    tags: ['A/B Testing', 'Statistical Power', 'Experiment Design', 'Velocity'],
    problemStatement: 'Engineering reports that 70% of A/B tests fail to reach significance. Need to diagnose whether this is poor design, insufficient sample size, or real null results.',
    datasetOverview: '1,240 experiments over 6 months. Columns: experiment_id, variant, sample_size, duration_days, metric_name, baseline_mean, treatment_mean, p_value, mde, winner.',
    cleaningProcess: [
      'Excluded 89 experiments with <100 users per variant',
      'Standardized metric names across 12 systems',
      'Filled MDE from pre-registration where available',
      'Quality Score: 92/100',
    ],
    kpis: [
      { name: 'Experiment Velocity', value: '48/wk', change: '+12', trend: 'up' },
      { name: 'Significance Rate', value: '32%', change: '-8pp', trend: 'down' },
      { name: 'Avg Power', value: '0.58', change: '-0.15', trend: 'down' },
      { name: 'Median Duration', value: '12 days', change: '+3d', trend: 'down' },
      { name: 'Ship Rate', value: '41%', change: '-5pp', trend: 'down' },
      { name: 'False Discovery (est)', value: '18%', change: '+6pp', trend: 'down' },
    ],
    sqlQueries: [
      {
        title: 'Power vs Outcome',
        query: `SELECT 
  CASE WHEN pre_reg_power >= 0.8 THEN 'high' WHEN pre_reg_power >= 0.6 THEN 'medium' ELSE 'low' END AS power_tier,
  COUNT(*) AS experiments,
  SUM(CASE WHEN p_value < 0.05 THEN 1 ELSE 0 END)::FLOAT / COUNT(*) AS sig_rate
FROM experiments
GROUP BY 1;`,
        explanation: 'Correlates pre-registered power with actual significance rate.',
      },
    ],
    pythonCode: `import pandas as pd
from scipy import stats
df = pd.read_csv('experiments.csv')
sig = df[df['p_value'] < 0.05]
print(f"Significance rate: {len(sig)/len(df):.1%}")
print(f"Avg power (where available): {df['pre_reg_power'].mean():.2f}")`,
    insights: [
      'Experiments with pre-registered power ≥0.8 reach significance 58% of the time vs 22% for low-power tests.',
      'Median sample size (1,200/arm) is insufficient for 5% MDE on conversion — need 3,400+ for 80% power.',
      'Peak experimentation in Week 26 coincided with multiple conflicting tests on checkout — possible interference.',
    ],
    executiveSummary: 'Low statistical power is the primary driver of failed experiments. Implementing mandatory power analysis (min 80%) and experiment registry before launch could improve significance rate to 50%+ and reduce false discoveries.',
    recommendations: [
      'Require power ≥0.8 and pre-registration before experiment start',
      'Extend median run time to 21 days for conversion experiments',
      'Implement experiment conflict detection (overlapping audiences)',
    ],
    impact: 'Projected 2x improvement in actionable experiment outcomes within 8 weeks.',
    tools: ['PostgreSQL', 'Python', 'Eppo', 'Statsig'],
    sampleData: Array.from({ length: 40 }, (_, i) => ({
      experiment_id: `exp_${100 + i}`,
      variant: ['control', 'treatment'][i % 2],
      sample_size: Math.round(800 + Math.random() * 3000),
      duration_days: 7 + Math.floor(Math.random() * 14),
      metric_name: ['conversion_rate', 'revenue_per_user', 'session_duration'][i % 3],
      baseline_mean: +(0.02 + Math.random() * 0.05).toFixed(4),
      treatment_mean: +(0.021 + Math.random() * 0.06).toFixed(4),
      p_value: +(Math.random() * 0.15).toFixed(4),
      mde: 0.05,
      winner: Math.random() > 0.65 ? 'treatment' : 'inconclusive',
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
  {
    id: 'model-quality-drift',
    category: 'ai',
    title: 'Model Quality & Drift Detection',
    subtitle: 'Identifying inference degradation and data drift in production ML',
    company: 'AI Platform (Hugging Face-style)',
    role: 'ML Operations Analyst',
    duration: '5 weeks',
    icon: 'Brain',
    tags: ['Model Drift', 'Data Quality', 'Monitoring', 'MLOps'],
    problemStatement: 'Customer complaints about model quality increased 3x in Q3. Need to determine if this is input distribution shift, label drift, or model degradation.',
    datasetOverview: '12M inference logs over 90 days. Columns: request_id, model_version, input_hash, prediction, confidence, ground_truth (sample), timestamp, customer_id.',
    cleaningProcess: [
      'Sampled 2% for ground truth comparison (100K labeled)',
      'Normalized confidence scores across model versions',
      'Removed 0.3% malformed requests',
      'Quality Score: 97/100',
    ],
    kpis: [
      { name: 'Accuracy (prod)', value: '89.2%', change: '-4.1pp', trend: 'down' },
      { name: 'PSI (input drift)', value: '0.18', change: '+0.12', trend: 'down' },
      { name: 'Label Drift', value: '0.09', change: '+0.06', trend: 'down' },
      { name: 'Confidence Calibration', value: '0.92', change: '-0.05', trend: 'down' },
      { name: 'P95 Latency', value: '340ms', change: '+45ms', trend: 'down' },
      { name: 'Error Rate', value: '1.2%', change: '+0.5pp', trend: 'down' },
    ],
    sqlQueries: [
      {
        title: 'Accuracy by Model Version & Week',
        query: `SELECT model_version, DATE_TRUNC('week', timestamp) AS week,
  SUM(CASE WHEN prediction = ground_truth THEN 1 ELSE 0 END)::FLOAT / COUNT(*) AS accuracy
FROM inference_sample
WHERE ground_truth IS NOT NULL
GROUP BY 1, 2
ORDER BY 2, 1;`,
        explanation: 'Tracks accuracy over time to detect model degradation.',
      },
    ],
    pythonCode: `import pandas as pd
from scipy.stats import entropy
df = pd.read_csv('inference_sample.csv')
acc = df.groupby('model_version')['correct'].mean()
psi = entropy(df['input_bin'].value_counts(normalize=True), [0.1]*10)
print("Accuracy by version:", acc)`,
    insights: [
      'V2 model deployed in Week 30 shows 5.2pp accuracy drop on new customer segments (non-US).',
      'Input distribution PSI increased from 0.06 to 0.18 — significant drift in feature space.',
      'Calibration degraded: when model predicts 90% confidence, actual accuracy is 84%.',
    ],
    executiveSummary: 'Primary cause is input distribution drift from new customer segments. Model V2 was trained on US-centric data. Retraining with expanded dataset and adding drift monitoring (weekly PSI) recommended.',
    recommendations: [
      'Retrain model with Q3 data including new segments',
      'Implement weekly PSI monitoring with 0.15 threshold alert',
      'Add calibration layer for confidence scores',
    ],
    impact: 'Projected accuracy recovery to 92%+ and 50% reduction in quality complaints.',
    tools: ['PostgreSQL', 'Python', 'Evidently', 'MLflow'],
    sampleData: Array.from({ length: 45 }, (_, i) => ({
      request_id: `inf_${5000 + i}`,
      model_version: ['v1', 'v2', 'v2'][i % 3],
      input_hash: `h${(1000 + i * 7) % 10000}`,
      prediction: ['pos', 'neg', 'pos'][i % 3],
      confidence: +(0.7 + Math.random() * 0.3).toFixed(3),
      ground_truth: Math.random() > 0.1 ? ['pos', 'neg', 'pos'][i % 3] : null,
      timestamp: new Date(2025, 6, 1 + Math.floor(i / 3)).toISOString(),
      customer_id: `c_${100 + (i % 20)}`,
    })),
  },
  {
    id: 'prompt-engineering-roi',
    category: 'ai',
    title: 'Prompt Engineering ROI Analysis',
    subtitle: 'Quantifying impact of prompt improvements on output quality and cost',
    company: 'AI Writing Assistant',
    role: 'AI Product Analyst',
    duration: '4 weeks',
    icon: 'Brain',
    tags: ['Prompt Optimization', 'Quality Metrics', 'ROI', 'A/B Test'],
    problemStatement: 'Team ships prompt improvements weekly but lacks systematic ROI measurement. Need framework to prioritize prompt changes by quality lift and cost impact.',
    datasetOverview: '4.2M generations with prompt_variant, quality_score, tokens_in, tokens_out, user_rating, task_type, timestamp.',
    cleaningProcess: [
      'Matched prompt variants to deployment dates',
      'Excluded 15K aborted requests',
      'Normalized quality_score to 0-1 scale',
      'Quality Score: 94/100',
    ],
    kpis: [
      { name: 'Avg Quality Score', value: '0.78', change: '+0.09', trend: 'up' },
      { name: 'Cost per 1K gens', value: '$2.40', change: '-18%', trend: 'up' },
      { name: 'User Rating', value: '4.2/5', change: '+0.3', trend: 'up' },
      { name: 'Prompt Variants Live', value: '24', change: '+8', trend: 'up' },
      { name: 'Tokens/Request', value: '1,240', change: '-12%', trend: 'up' },
      { name: 'Quality/Cost Ratio', value: '0.33', change: '+31%', trend: 'up' },
    ],
    sqlQueries: [
      {
        title: 'Quality and Cost by Prompt Variant',
        query: `SELECT prompt_variant, task_type,
  AVG(quality_score) AS avg_quality,
  AVG(tokens_in + tokens_out) AS avg_tokens,
  COUNT(*) AS requests
FROM generations
GROUP BY 1, 2
ORDER BY avg_quality DESC;`,
        explanation: 'Identifies highest ROI prompt variants by task type.',
      },
    ],
    pythonCode: `import pandas as pd
df = pd.read_csv('generations.csv')
roi = df.groupby('prompt_variant').agg(
    quality=('quality_score','mean'),
    cost=('tokens_total', lambda x: x.sum()*0.00002)
).assign(roi=lambda d: d['quality']/d['cost'])
print(roi.sort_values('roi', ascending=False))`,
    insights: [
      'Prompt v7 for "email" task improved quality by 0.12 with 8% token reduction — highest ROI.',
      'Long-form prompts (>800 tokens) show diminishing returns: +0.02 quality for +40% cost.',
      'User ratings correlate 0.78 with automated quality_score — validation of metric.',
    ],
    executiveSummary: 'Systematic prompt A/B testing framework shows 5 variants with >20% quality/cost improvement. Recommendation: ship top 3, deprecate 4 underperformers.',
    recommendations: [
      'Implement prompt registry with mandatory A/B before production',
      'Set quality/cost ROI threshold of 0.25 for new variants',
      'Weekly review of underperforming prompts',
    ],
    impact: 'Projected 15% cost reduction with 5% quality lift from prompt optimization pipeline.',
    tools: ['PostgreSQL', 'Python', 'Weights & Biases', 'LangSmith'],
    sampleData: Array.from({ length: 50 }, (_, i) => ({
      request_id: `gen_${8000 + i}`,
      prompt_variant: ['v5', 'v6', 'v7', 'v8'][i % 4],
      quality_score: +(0.65 + Math.random() * 0.35).toFixed(3),
      tokens_in: Math.round(200 + Math.random() * 800),
      tokens_out: Math.round(100 + Math.random() * 400),
      user_rating: Math.random() > 0.3 ? 4 + Math.floor(Math.random() * 2) : null,
      task_type: ['email', 'blog', 'summary', 'code'][i % 4],
      timestamp: new Date(2025, 7, 1 + Math.floor(i / 10)).toISOString(),
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
  {
    id: 'fraud-detection-ml',
    category: 'finance',
    title: 'Fraud Detection Model Tuning',
    subtitle: 'Reducing false positives while maintaining fraud recall',
    company: 'FinTech (Stripe-style)',
    role: 'Risk Analytics Lead',
    duration: '6 weeks',
    icon: 'DollarSign',
    tags: ['Fraud Detection', 'ML Tuning', 'Precision/Recall', 'Risk'],
    problemStatement: 'Fraud model blocks 2.1% of legitimate transactions (false positive rate). Support cost from declined customers is $340K/month. Need to tune thresholds and model without increasing fraud losses.',
    datasetOverview: '8.5M transactions with fraud_label, model_score, amount, merchant_category, country, device_fingerprint, user_tenure. 0.4% positive (fraud) rate.',
    cleaningProcess: [
      'Balanced sample for model evaluation (20K fraud, 80K legit)',
      'Excluded chargebacks still in dispute window',
      'Mapped merchant categories to 12 risk tiers',
      'Quality Score: 96/100',
    ],
    kpis: [
      { name: 'Fraud Recall', value: '94%', change: '-1pp', trend: 'neutral' },
      { name: 'False Positive Rate', value: '2.1%', change: '-0.8pp', trend: 'up' },
      { name: 'Precision', value: '18%', change: '+4pp', trend: 'up' },
      { name: 'Blocked $ (legit)', value: '$1.2M', change: '-$340K', trend: 'up' },
      { name: 'Fraud $ Caught', value: '$890K', change: '-$12K', trend: 'neutral' },
      { name: 'Manual Review Rate', value: '5.2%', change: '-1.5pp', trend: 'up' },
    ],
    sqlQueries: [
      {
        title: 'Precision-Recall by Threshold',
        query: `WITH scored AS (
  SELECT *, CASE WHEN model_score >= 0.5 THEN 1 ELSE 0 END AS predicted
  FROM transactions
)
SELECT 
  SUM(CASE WHEN fraud_label=1 AND predicted=1 THEN 1 ELSE 0 END)::FLOAT / NULLIF(SUM(predicted),0) AS precision,
  SUM(CASE WHEN fraud_label=1 AND predicted=1 THEN 1 ELSE 0 END)::FLOAT / SUM(CASE WHEN fraud_label=1 THEN 1 ELSE 0 END) AS recall
FROM scored;`,
        explanation: 'Calculates precision-recall at 0.5 threshold; can sweep thresholds.',
      },
    ],
    pythonCode: `import pandas as pd
from sklearn.metrics import precision_recall_curve
df = pd.read_csv('transactions_scored.csv')
prec, rec, thresh = precision_recall_curve(df['fraud_label'], df['model_score'])
# Find threshold for 95% recall
idx = np.argmin(np.abs(rec - 0.95))
print(f"Threshold: {thresh[idx]:.3f}, Precision: {prec[idx]:.2%}")`,
    insights: [
      'Lowering threshold from 0.5 to 0.42 reduces FPR from 2.1% to 1.3% with only 1pp recall loss.',
      'Merchant category "digital goods" has 3x higher FPR — separate threshold recommended.',
      'Users with tenure >12 months have 50% lower fraud rate — consider trust tiers.',
    ],
    executiveSummary: 'Threshold optimization and segment-specific rules can reduce false positives by 40% while maintaining fraud recall above 93%. Expected support cost savings of $120K/month.',
    recommendations: [
      'Deploy segment-specific thresholds (digital goods, new users)',
      'Add trust-tier override for tenured users',
      'Implement dynamic threshold based on transaction amount bands',
    ],
    impact: 'Projected $120K/month support cost reduction, $1.1M annual savings.',
    tools: ['PostgreSQL', 'Python', 'Scikit-learn', 'XGBoost'],
    sampleData: Array.from({ length: 55 }, (_, i) => ({
      txn_id: `txn_${30000 + i}`,
      fraud_label: i % 250 === 0,
      model_score: +(0.1 + Math.random() * 0.9).toFixed(3),
      amount: +(10 + Math.random() * 500).toFixed(2),
      merchant_category: ['retail', 'digital_goods', 'services', 'travel'][i % 4],
      country: ['US', 'UK', 'NG', 'IN', 'BR'][i % 5],
      user_tenure_days: Math.round(30 + Math.random() * 700),
    })),
  },
  {
    id: 'cac-ltv-segmentation',
    category: 'finance',
    title: 'CAC/LTV Segmentation & CLV Model',
    subtitle: 'Building LTV prediction model for marketing budget allocation',
    company: 'Subscription SaaS',
    role: 'Finance Analytics',
    duration: '5 weeks',
    icon: 'DollarSign',
    tags: ['LTV', 'CAC', 'Segmentation', 'CLV Model'],
    problemStatement: 'Marketing allocates budget uniformly across segments. Need data-driven segmentation by CAC/LTV to optimize spend and improve payback period.',
    datasetOverview: '120K customers with cohort, acquisition_channel, cac, mrr, churn_date, ltv_actual, tenure_months.',
    cleaningProcess: [
      'Excluded enterprise (manual sales) from CLV model',
      'Filled LTV for active customers using cohort-based survival',
      'Standardized channel names from 8 sources',
      'Quality Score: 91/100',
    ],
    kpis: [
      { name: 'Blended CAC', value: '$156', change: '+22%', trend: 'down' },
      { name: 'Blended LTV', value: '$420', change: '-8%', trend: 'down' },
      { name: 'LTV:CAC', value: '2.7x', change: '-0.5', trend: 'down' },
      { name: 'Payback (months)', value: '11', change: '+2', trend: 'down' },
      { name: 'Best Segment LTV:CAC', value: '4.2x', change: '—', trend: 'neutral' },
      { name: 'Worst Segment LTV:CAC', value: '1.1x', change: '—', trend: 'down' },
    ],
    sqlQueries: [
      {
        title: 'LTV:CAC by Channel',
        query: `SELECT acquisition_channel,
  AVG(cac) AS avg_cac,
  AVG(ltv_actual) AS avg_ltv,
  AVG(ltv_actual) / NULLIF(AVG(cac), 0) AS ltv_cac_ratio
FROM customers
GROUP BY 1
ORDER BY ltv_cac_ratio DESC;`,
        explanation: 'Identifies highest and lowest ROI acquisition channels.',
      },
    ],
    pythonCode: `import pandas as pd
df = pd.read_csv('customers.csv')
seg = df.groupby('acquisition_channel').agg(cac=('cac','mean'), ltv=('ltv_actual','mean'))
seg['ratio'] = seg['ltv']/seg['cac']
print(seg.sort_values('ratio', ascending=False))`,
    insights: [
      'Content/SEO has 4.2x LTV:CAC but receives only 8% of budget. Paid social at 1.1x gets 35%.',
      'Enterprise segment has 6-month payback vs 14 for SMB — prioritize enterprise in outbound.',
      'Cohort from 2024-H2 has 18% lower LTV — possible quality decline in acquisition.',
    ],
    executiveSummary: 'Reallocating 25% of paid social budget to content/SEO could improve blended LTV:CAC from 2.7x to 3.4x. CLV model accuracy (MAPE 22%) sufficient for prioritization.',
    recommendations: [
      'Shift budget to channels with LTV:CAC > 3x',
      'Build CLV-based bid adjustment for paid channels',
      'Quarterly segment review with finance',
    ],
    impact: 'Projected LTV:CAC improvement to 3.4x, $2.1M annual savings in acquisition.',
    tools: ['PostgreSQL', 'Python', 'Tableau', 'Survival Analysis'],
    sampleData: Array.from({ length: 50 }, (_, i) => ({
      customer_id: `cust_${4000 + i}`,
      cohort: `2025-${String(Math.floor(i/12) + 1).padStart(2,'0')}`,
      acquisition_channel: ['paid_social', 'content', 'paid_search', 'referral'][i % 4],
      cac: Math.round(80 + Math.random() * 150),
      mrr: Math.round(30 + Math.random() * 100),
      churn_date: Math.random() > 0.7 ? new Date(2025, 8, 1).toISOString().slice(0, 10) : null,
      ltv_actual: Math.round(200 + Math.random() * 600),
      tenure_months: Math.floor(Math.random() * 18),
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
  {
    id: 'referral-program-optimization',
    category: 'growth',
    title: 'Referral Program Optimization',
    subtitle: '2x referral signups through incentive and UX testing',
    company: 'B2C App (Dropbox-style)',
    role: 'Growth Analytics Lead',
    duration: '6 weeks',
    icon: 'Rocket',
    tags: ['Referral', 'Viral Loop', 'Incentive Design', 'Activation'],
    problemStatement: 'Referral contributes only 8% of new signups despite 45% of users saying they would refer. Need to identify friction points and optimize incentive structure.',
    datasetOverview: '65K referral events: referrer_id, referee_id, incentive_tier, referral_flow_version, share_method, conversion_timestamp, referee_activated.',
    cleaningProcess: [
      'Matched referral events to user signups (94% match)',
      'Excluded self-referral attempts (0.3%)',
      'Mapped 6 share methods to standardized IDs',
      'Quality Score: 93/100',
    ],
    kpis: [
      { name: 'Referral Share Rate', value: '12%', change: '+4pp', trend: 'up' },
      { name: 'Referral Conversion', value: '28%', change: '+9pp', trend: 'up' },
      { name: 'K-Factor', value: '0.18', change: '+0.08', trend: 'up' },
      { name: 'Referee D7 Retention', value: '52%', change: '+11pp', trend: 'up' },
      { name: 'Cost per Referral', value: '$12', change: '-$4', trend: 'up' },
      { name: 'Referral % of Signups', value: '16%', change: '+8pp', trend: 'up' },
    ],
    sqlQueries: [
      {
        title: 'Conversion by Flow Version',
        query: `SELECT referral_flow_version, incentive_tier,
  COUNT(*) AS shares,
  SUM(CASE WHEN referee_activated THEN 1 ELSE 0 END)::FLOAT / COUNT(*) AS conv_rate
FROM referral_events
GROUP BY 1, 2
ORDER BY conv_rate DESC;`,
        explanation: 'Identifies best-performing flow and incentive combinations.',
      },
    ],
    pythonCode: `import pandas as pd
df = pd.read_csv('referral_events.csv')
funnel = df.groupby('referral_flow_version').agg(
    shares=('referrer_id','count'),
    conversions=('referee_activated','sum')
)
funnel['rate'] = funnel['conversions']/funnel['shares']
print(funnel)`,
    insights: [
      'Flow v3 (native share sheet) has 38% conversion vs 19% for v1 (copy link).',
      'Tier 2 incentive ($20 vs $10) improves conversion by 12pp but increases Cost per Referral by 45% — marginal ROI.',
      'Referrals from mobile have 2.1x higher referee retention than web.',
    ],
    executiveSummary: 'Deploying Flow v3 (native share) to 100% and testing incentive timing (reward on activation vs signup) could achieve 2x referral signups within 8 weeks.',
    recommendations: [
      'Roll out Flow v3 to all users — expected +15pp conversion',
      'A/B test reward-on-activation vs reward-on-signup',
      'Add in-app referral reminder at key activation milestones',
    ],
    impact: 'Projected referral % of signups from 8% to 16%, K-factor from 0.10 to 0.18.',
    tools: ['PostgreSQL', 'Python', 'Amplitude', 'Branch'],
    sampleData: Array.from({ length: 55 }, (_, i) => ({
      referrer_id: `r_${1000 + i}`,
      referee_id: `ref_${2000 + i}`,
      incentive_tier: ['tier1', 'tier2', 'tier1'][i % 3],
      referral_flow_version: ['v1', 'v2', 'v3'][i % 3],
      share_method: ['native', 'link', 'email'][i % 3],
      conversion_timestamp: new Date(2025, 7, 1 + (i % 20)).toISOString(),
      referee_activated: Math.random() > 0.6,
    })),
  },
  {
    id: 'landing-page-conversion',
    category: 'growth',
    title: 'Landing Page Conversion Optimization',
    subtitle: 'Increasing signup conversion from 2.1% to 4.5% through experimentation',
    company: 'Developer Tools (Vercel-style)',
    role: 'Growth Analyst',
    duration: '4 weeks',
    icon: 'Rocket',
    tags: ['Conversion Rate', 'Landing Page', 'Experimentation', 'CRO'],
    problemStatement: 'Paid traffic converts at 2.1% vs industry benchmark 4-5%. Landing page has not been tested in 18 months. Need systematic CRO program.',
    datasetOverview: '320K page views with variant, scroll_depth, time_on_page, cta_clicked, signed_up, traffic_source, device. 15 A/B tests over 4 weeks.',
    cleaningProcess: [
      'Filtered bots (scroll_depth=0, time<2s) — 12% of traffic',
      'Mapped 8 variant names to test_id',
      'Excluded returning users (cookie-based)',
      'Quality Score: 94/100',
    ],
    kpis: [
      { name: 'Baseline Conversion', value: '2.1%', change: '—', trend: 'neutral' },
      { name: 'Best Variant Conversion', value: '4.6%', change: '+2.5pp', trend: 'up' },
      { name: 'CTA Click Rate', value: '18%', change: '+7pp', trend: 'up' },
      { name: 'Scroll to 80%', value: '42%', change: '+15pp', trend: 'up' },
      { name: 'Bounce Rate', value: '58%', change: '-12pp', trend: 'up' },
      { name: 'Signup/1K Visitors', value: '46', change: '+25', trend: 'up' },
    ],
    sqlQueries: [
      {
        title: 'Conversion by Variant',
        query: `SELECT variant,
  COUNT(*) AS visitors,
  SUM(CASE WHEN signed_up THEN 1 ELSE 0 END)::FLOAT / COUNT(*) AS conv_rate
FROM landing_visits
GROUP BY variant
HAVING COUNT(*) >= 5000
ORDER BY conv_rate DESC;`,
        explanation: 'Identifies winning variants with sufficient sample size.',
      },
    ],
    pythonCode: `import pandas as pd
from scipy import stats
df = pd.read_csv('landing_visits.csv')
control = df[df['variant']=='control']['signed_up']
treatment = df[df['variant']=='winner']['signed_up']
chi2, p = stats.chi2_contingency(pd.crosstab(df['variant'], df['signed_up']))[:2]
print(f"Chi-square p-value: {p:.4f}")`,
    insights: [
      'Hero section simplification (1 CTA vs 3) increased CTA clicks by 34%.',
      'Adding social proof (customer logos) above fold improved conversion by 1.8pp.',
      'Removing signup form from first screen (show value first) reduced bounce by 18%.',
    ],
    executiveSummary: 'Combining top 3 test winners into single variant yields 4.6% conversion (2.2x baseline). Recommendation: ship combined variant, then iterate on pricing page.',
    recommendations: [
      'Ship combined winner variant to 100%',
      'Run follow-up tests on pricing page (next step in funnel)',
      'Implement session recording to identify new friction points',
    ],
    impact: 'Projected 2x conversion improvement, 50% CAC reduction for paid channel.',
    tools: ['PostgreSQL', 'Python', 'Google Optimize', 'Hotjar'],
    sampleData: Array.from({ length: 60 }, (_, i) => ({
      visit_id: `v_${50000 + i}`,
      variant: ['control', 'hero_simple', 'social_proof', 'value_first', 'winner'][i % 5],
      scroll_depth: Math.round(Math.random() * 100),
      time_on_page: Math.round(10 + Math.random() * 120),
      cta_clicked: Math.random() > 0.75,
      signed_up: Math.random() > 0.94,
      traffic_source: ['paid', 'organic', 'direct'][i % 3],
      device: ['desktop', 'mobile'][i % 2],
    })),
  },
];

export function getCaseStudy(id: string): CaseStudy | undefined {
  return CASE_STUDIES.find(c => c.id === id);
}

export function getCaseStudiesByCategory(category: CaseCategory): CaseStudy[] {
  return CASE_STUDIES.filter(c => c.category === category);
}
