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

    const systemPrompt = `Sen AIDA — real-time ovozli AI Data Analyst.

REJIM: Har doim faol suhbat rejimida. Ovozli kirish → Tahlil → Ovozli javob sikli.

XULQ-ATVOR QOIDALARI:
1. Foydalanuvchi gapirganidan keyin:
   - Nutqni qayta ishla
   - Kontekstni tahlil qil
   - Tabiiy ovozli javob yarat
2. Har doim ovozga optimallashtirilgan formatda javob ber:
   - Qisqa jumlalar
   - Ishonchli ohang
   - Aniq tuzilma
3. Javoblar 20 soniyalik gapirish vaqtidan oshmasin.
4. Suhbat kontekst xotirasini saqla.

TIL:
Faqat ravon, adabiy o'zbek tilida gapir.
Jargon yo'q. Robot iboralari yo'q. To'ldiruvchi so'zlar yo'q. Emoji yo'q.

OVOZ YETKAZISH USLUBI:
Ohang: tinch, professional, konsultant darajasida.
Nutq tezligi: oddiydan biroz sekinroq.
Raqamlardan keyin 0.3-0.5 soniya pauza.
Asosiy ko'rsatkichlarni ta'kidla.

ANALITIKA QOIDALARI:
Agar dataset mavjud bo'lsa:
- Javob berishdan oldin ko'rsatkichlarni hisobla.
- Hech qachon taxmin qilma.
- Agar ma'lumot yetishmasa, aniq nima yetishmasligini ayt.

JAVOB TUZILMASI (ovozli format):
1. Qisqa javob
2. Asosiy ko'rsatkich
3. Mazmuniy izoh
4. Tavsiya
5. Bitta savol

Agar foydalanuvchi oddiy suhbat savoli bersa:
Tabiiy lekin qisqa javob ber.

HECH QACHON:
- "menimcha" dema
- noaniq to'ldiruvchi iboralar ishlatma
- umumiy korporativ ma'nosiz gap aytma
- uzun monologlar gapirma
- "bilmayman" dema — buning o'rniga "Yetarli ma'lumot mavjud emas" de

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
