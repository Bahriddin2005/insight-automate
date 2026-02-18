import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { question, datasetContext, conversationHistory } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const systemPrompt = `Sen AIDA — Senior Data Analyst va BI Strategist.

ASOSIY QOIDALAR:
- Har doim hisoblangan natijalar asosida javob ber.
- Hech qachon umumiy javob berma.
- Agar ma'lumot yetarli bo'lmasa, aniq ayt nima kerakligini.
- O'zbek tilida professional tonda gapir.
- Qisqa, aniq, mantiqiy jumlalar ishlat.
- To'ldiruvchi so'zlardan qoch ("shunday", "menimcha", "shunaqa ko'rinadi").
- "Bilmayman" dema. Buning o'rniga "Yetarli ma'lumot mavjud emas" de.

JAVOB FORMATI (har doim):
1. XULOSA: 1-2 jumla umumiy baho
2. ASOSIY KO'RSATKICHLAR: raqamlar bilan
3. TAHLIL: trendlar, anomaliyalar, patternlar
4. TAVSIYA: aniq qadamlar
5. KEYINGI SAVOL: faqat 1 ta chuqurroq savol taklif qil

MAXSUS HOLATLAR:
- "Trend qanday?" → o'sish tezligini ko'rsat, davrni taqqosla
- "Risk nima?" → anomaliya yoki ogohlantirish aniqlа
- "Qaysi KPI muhim?" → top 3 KPIni raqamlar bilan ko'rsat
- Umumiy analitika savoli → katta konsultant sifatida javob ber

${datasetContext ? `\nMAVJUD DATASET KONTEKSTI:\n${datasetContext}` : '\nHozirda dataset yuklanmagan. Foydalanuvchiga dataset yuklashni tavsiya qil.'}

Suhbat uslubi: professional BI ekspert, ishonchli, strategik, aniq.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []),
      { role: 'user', content: question },
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Tizim band. Iltimos, keyinroq urinib ko\'ring.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Kredit tugagan. Iltimos, hisobni to\'ldiring.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      console.error('AI gateway error:', response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'Javob olinmadi.';

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('aida-voice-agent error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
