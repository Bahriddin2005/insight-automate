import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split('T')[0];

    // Get all users who have churn risk scores
    const { data: latestScores, error: fetchErr } = await supabase
      .from('churn_risk_scores')
      .select('user_id, snapshot_date, risk_score, risk_level, student_name')
      .order('snapshot_date', { ascending: false });

    if (fetchErr) throw fetchErr;
    if (!latestScores?.length) {
      return new Response(JSON.stringify({ message: 'No churn scores found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group by user, get latest snapshot per user
    const byUser: Record<string, typeof latestScores> = {};
    latestScores.forEach(s => {
      if (!byUser[s.user_id]) byUser[s.user_id] = [];
      byUser[s.user_id].push(s);
    });

    const summaries: any[] = [];

    for (const [userId, scores] of Object.entries(byUser)) {
      // Get the latest snapshot date for this user
      const latestDate = scores[0].snapshot_date;
      const latestScoresForUser = scores.filter(s => s.snapshot_date === latestDate);

      const totalStudents = latestScoresForUser.length;
      const avgRisk = Math.round(latestScoresForUser.reduce((s, i) => s + i.risk_score, 0) / totalStudents);
      const criticalCount = latestScoresForUser.filter(i => i.risk_level === 'critical').length;
      const highCount = latestScoresForUser.filter(i => i.risk_level === 'high').length;

      // Find previous week's snapshot for comparison
      const prevScores = scores.filter(s => s.snapshot_date !== latestDate);
      const prevDate = prevScores.length ? prevScores[0].snapshot_date : null;
      const prevScoresForDate = prevDate ? scores.filter(s => s.snapshot_date === prevDate) : [];

      let riskDelta = null;
      let criticalDelta = null;
      if (prevScoresForDate.length) {
        const prevAvg = Math.round(prevScoresForDate.reduce((s, i) => s + i.risk_score, 0) / prevScoresForDate.length);
        const prevCritical = prevScoresForDate.filter(i => i.risk_level === 'critical').length;
        riskDelta = avgRisk - prevAvg;
        criticalDelta = criticalCount - prevCritical;
      }

      summaries.push({
        user_id: userId,
        snapshot_date: today,
        total_students: totalStudents,
        avg_risk: avgRisk,
        critical_count: criticalCount,
        high_count: highCount,
        risk_delta: riskDelta,
        critical_delta: criticalDelta,
        previous_date: prevDate,
      });
    }

    return new Response(JSON.stringify({
      message: `Weekly snapshot generated for ${summaries.length} users`,
      date: today,
      summaries,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('weekly-churn-snapshot error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
