import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { timeSeries, forecastDays, metricName, language } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    if (!timeSeries || !Array.isArray(timeSeries) || timeSeries.length < 7) {
      return new Response(JSON.stringify({ error: 'Kamida 7 ta vaqt nuqtasi kerak.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const days = forecastDays || 30;
    const lang = language || 'uz';

    // Prepare data summary for AI
    const dataPoints = timeSeries.slice(0, 500);
    const dataStr = dataPoints.map((p: { ds: string; y: number }) => `${p.ds}: ${p.y}`).join('\n');

    // Compute basic stats for context
    const values = dataPoints.map((p: { y: number }) => p.y);
    const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const sorted = [...values].sort((a: number, b: number) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const outlierCount = values.filter((v: number) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr).length;

    const prompt = `You are a Prophet-level time series forecasting engine AND a Senior Data Analyst.

DATASET: ${metricName || 'metric'}
Data points: ${dataPoints.length}
Time span: ${dataPoints[0]?.ds} to ${dataPoints[dataPoints.length - 1]?.ds}
Mean: ${mean.toFixed(2)}, Q1: ${q1}, Q3: ${q3}, IQR: ${iqr.toFixed(2)}
Outliers (IQR method): ${outlierCount}

RAW DATA:
${dataStr}

ANALYSIS STEPS:
1. DATA VALIDATION: Check continuity, frequency (daily/weekly/monthly), gaps
2. DATA PREPARATION: Account for outliers, missing periods, trend stationarity
3. FORECASTING: Generate ${days}-day forecast with widening confidence intervals
4. INTERPRETATION: Provide professional business analysis

RESPOND WITH ONLY VALID JSON:
{
  "forecast": [
    {"ds": "YYYY-MM-DD", "yhat": number, "yhat_lower": number, "yhat_upper": number}
  ],
  "trend": {
    "direction": "up" | "down" | "flat",
    "strength": number 0-1,
    "daily_change": number,
    "growth_rate_percent": number
  },
  "seasonality": {
    "has_weekly": boolean,
    "has_monthly": boolean,
    "has_yearly": boolean,
    "dominant_period": "weekly" | "monthly" | "yearly" | "none",
    "peak_day_of_week": string or null,
    "peak_month": string or null
  },
  "changepoints": [
    {"date": "YYYY-MM-DD", "type": "increase" | "decrease", "magnitude": number}
  ],
  "anomalies": [
    {"date": "YYYY-MM-DD", "value": number, "expected": number, "severity": "low" | "medium" | "high"}
  ],
  "volatility": {
    "coefficient_of_variation": number,
    "bands_widening": boolean,
    "uncertainty_trend": "stable" | "increasing" | "decreasing"
  },
  "summary": {
    "title": "string - brief title",
    "insights": ["max 5 key insights with specific numbers"],
    "risk_level": "low" | "medium" | "high",
    "risk_reason": "string with specific data evidence",
    "recommendation": "string - strategic recommendation with actionable steps",
    "recommended_actions": ["specific action 1", "specific action 2", "specific action 3"]
  },
  "model_confidence": number 0-1,
  "mape": number
}

RULES:
- Forecast exactly ${days} data points starting day after last data point
- yhat_lower and yhat_upper MUST widen gradually (increasing uncertainty)
- Use actual statistical reasoning based on computed stats above
- Confidence intervals must reflect data volatility (CV = ${(Math.sqrt(values.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / values.length) / mean * 100).toFixed(1)}%)
- All insights must include specific numbers from the data
- All text in summary in ${lang === 'uz' ? "O'zbek" : 'English'} language
- recommended_actions must be concrete and actionable
- Never fabricate numbers - compute from the data provided`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a precise time-series forecasting engine and senior data analyst. Return ONLY valid JSON, no markdown, no explanation. Every number must be computed from the provided data.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('AI Gateway error:', response.status, text);
      throw new Error(`Forecast error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse forecast JSON:', content);
      throw new Error('Forecast natijasini qayta ishlashda xatolik');
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('prophet-forecast error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
