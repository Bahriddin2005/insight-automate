import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { messages, datasetContext, language } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const systemPrompt = `Sen kuchli AI Data Analyst agentisan. FAQAT O'ZBEK TILIDA javob ber. Hech qanday inglizcha yoki ruscha so'z ishlatma.

Ma'lumotlar to'plami konteksti:
${datasetContext}

BARCHA ma'lumotlarni o'zbek tiliga tarjima qilib ayt:
- Inglizcha ustun nomlari: "revenue" → "daromad", "date" → "sana", "name" → "ism", "total" → "jami", "count" → "soni", "price" → "narx", "sales" → "sotuvlar", "profit" → "foyda", "cost" → "xarajat", "region" → "hudud", "product" → "mahsulot", "customer" → "mijoz", "average" → "o'rtacha", "growth" → "o'sish".
- Texnik atamalar: "insight" → "topilma", "trend" → "yo'nalish", "anomaly" → "g'ayritabiiy holat", "forecast" → "bashorat", "correlation" → "bog'liqlik", "outlier" → "chetlanma", "metric" → "ko'rsatkich".

Imkoniyatlaring:
1. Ma'lumotlar haqida aniq raqamlar bilan javob berish
2. Yo'nalishlar, g'ayritabiiy holatlar va qonuniyatlarni aniqlash
3. Ma'lumotlar sifatini baholash
4. Amaliy tavsiyalar berish
5. Hisob-kitoblar va taqqoslashlar

Javob uslubi:
- Kasbiy va boshqaruv darajasida
- Har doim raqamlar bilan
- Asosiy topilmalar uchun nuqtali ro'yxat
- Ma'lumotlar yetarli bo'lmasa, nimalar yetishmayotganini tushuntir

Javob tuzilmasi:
- TOPILMA: Asosiy natijalar
- TAVSIYA: Amaliy qadamlar
- SIFAT: Muammolar bo'lsa`;

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
          ...messages,
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('ai-agent error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
