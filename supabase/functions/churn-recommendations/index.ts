import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { students } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const studentsSummary = students.map((s: any) =>
      `- ${s.student} (${s.sinf}): risk=${s.riskScore}%, to'lov=${s.totalPaid}, tx=${s.txCount}, usul=${s.preferredMethod}, oxirgi=${s.lastPayment}, recency=${s.recencyDays} kun`
    ).join('\n');

    const systemPrompt = `Sen ta'lim muassasasi uchun AI retention strategist san. FAQAT O'ZBEK TILIDA javob ber.

Har bir o'quvchi uchun qisqa, aniq va AMALIY retention tavsiya ber.

Format (har bir o'quvchi uchun):
**[O'quvchi ismi]** ([Sinf]) — Risk: [X]%
📋 Tavsiya: [1-2 jumla bilan aniq harakat rejasi]
💡 Sabab: [Nima uchun risk yuqori/past]

Qoidalar:
- Critical (70+%): Darhol shaxsiy aloqa, ota-ona bilan suhbat
- High (50-69%): SMS eslatma, to'lov rejasi taklifi
- Medium (30-49%): Monitoring, motivatsion xabar
- Low (<30%): Minnatdorchilik, sodiqlik bonus`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Quyidagi o'quvchilar uchun shaxsiy retention strategiyasi ber:\n\n${studentsSummary}` },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited, keyinroq urinib ko\'ring.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Kreditlar tugadi.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      console.error('AI error:', response.status, text);
      throw new Error(`AI error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('churn-recommendations error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
