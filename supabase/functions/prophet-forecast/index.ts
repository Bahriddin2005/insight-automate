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
    const dataPoints = timeSeries.slice(0, 500); // Limit for token budget
    const dataStr = dataPoints.map((p: { ds: string; y: number }) => `${p.ds}: ${p.y}`).join('\n');

    const prompt = `You are a Prophet-level time series forecasting engine. Analyze this time series data and generate a forecast.

DATASET (${metricName || 'metric'}):
${dataStr}

TASK:
1. Analyze the historical data for trends, seasonality (weekly, monthly, yearly), and anomalies
2. Generate a ${days}-day forecast with confidence intervals
3. Detect change points in the data
4. Identify seasonal patterns

RESPOND WITH ONLY VALID JSON in this exact format:
{
  "forecast": [
    {"ds": "YYYY-MM-DD", "yhat": number, "yhat_lower": number, "yhat_upper": number}
  ],
  "trend": {
    "direction": "up" | "down" | "flat",
    "strength": number between 0-1,
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
  "summary": {
    "${lang === 'uz' ? 'title' : 'title'}": "string - brief title",
    "insights": ["string - key insight 1", "string - key insight 2", "...max 5"],
    "risk_level": "low" | "medium" | "high",
    "risk_reason": "string",
    "recommendation": "string - strategic recommendation"
  },
  "model_confidence": number between 0-1,
  "mape": number (mean absolute percentage error estimate)
}

RULES:
- Forecast must have exactly ${days} data points starting from the day after the last data point
- yhat_lower and yhat_upper must widen gradually (increasing uncertainty)
- Use actual statistical reasoning, not generic values
- Confidence intervals should reflect data volatility
- All text in summary should be in ${lang === 'uz' ? "O'zbek" : 'English'} language
- Numbers must be realistic based on the data patterns`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a precise time-series forecasting engine. Return ONLY valid JSON, no markdown, no explanation.' },
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

    // Parse JSON from response (handle markdown code blocks)
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
