import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { columnInfo, rows, columns, qualityScore, missingPercent, duplicatesRemoved, dateRange, language } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const systemPrompt = `Sen katta tajribali ma'lumot tahlilchisisisan. Ma'lumotlar to'plami haqida qisqa, mazmunli xulosa yoz (to'rt-olti gap). FAQAT O'ZBEK TILIDA yoz. Inglizcha va ruscha so'z ISHLATMA. Ustun nomlarini o'zbekchaga tarjima qil. Raqamlarni aniq keltir. Asosiy qonuniyatlar, ma'lumot sifati va amaliy tavsiyalarga e'tibor ber. Markdown formatlash ISHLATMA.`;

    const colDetails = columnInfo.map((c: any) => {
      let desc = `- ${c.name} (${c.type}): ${c.uniqueCount} unique, ${c.missingPercent.toFixed(1)}% missing`;
      if (c.stats) desc += `, range: ${c.stats.min}–${c.stats.max}, avg: ${c.stats.mean.toFixed(2)}`;
      if (c.topValues?.length) desc += `, top: ${c.topValues.slice(0, 3).map((v: any) => v.value).join(', ')}`;
      return desc;
    }).join('\n');

    const userPrompt = `Dataset: ${rows} rows, ${columns} columns. Quality Score: ${qualityScore}/100. Missing: ${missingPercent}%. Duplicates removed: ${duplicatesRemoved}. ${dateRange ? `Date range: ${dateRange.min} to ${dateRange.max}.` : 'No date columns.'}\n\nColumns:\n${colDetails}`;

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
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited, please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted. Please add funds.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      console.error('AI gateway error:', response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || 'No summary generated.';

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('ai-summary error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
